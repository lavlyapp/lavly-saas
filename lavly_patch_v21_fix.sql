-- =========================================================================
-- V21: CORREÇÃO FATAL AWS (Borda) + ISOLAMENTO RBAC
-- Reverte a estrutura JSON para a original V18/V19, mantendo a nova
-- proteção contra vazamento de lojas (Isolamento RBAC).
-- =========================================================================

-- 1. FUNÇÃO FINANCEIRA
CREATE OR REPLACE FUNCTION get_financial_dashboard_metrics(p_store text DEFAULT 'Todas', p_start_date text DEFAULT NULL, p_end_date text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    metrics json;
    start_dia date;
    end_dia date;
    v_accessible_stores text[];
    v_exact_unique_customers numeric;
    v_uid uuid;
    v_role text;
    v_assigned text[];
BEGIN
    -- [CORREÇÃO RBAC]: Puxar apenas as lojas que o usuário tem acesso baseado na tabela profiles!
    v_uid := auth.uid();
    
    IF v_uid IS NOT NULL THEN
        SELECT role, assigned_stores INTO v_role, v_assigned FROM profiles WHERE id = v_uid;
        IF v_role = 'admin' THEN
            SELECT array_agg(name) INTO v_accessible_stores FROM stores;
        ELSIF v_assigned IS NOT NULL AND array_length(v_assigned, 1) > 0 THEN
            v_accessible_stores := v_assigned;
        ELSE
            v_accessible_stores := ARRAY['NENHUMA_LOJA']::text[];
        END IF;
    ELSE
        -- Fallback para Cron Jobs
        SELECT array_agg(name) INTO v_accessible_stores FROM stores;
    END IF;

    -- Ajuste de fuso horário seguro
    IF p_start_date IS NOT NULL THEN
        start_dia := (p_start_date::timestamp with time zone AT TIME ZONE 'America/Sao_Paulo')::date;
    ELSE
        start_dia := '2020-01-01'::date;
    END IF;

    IF p_end_date IS NOT NULL THEN
        end_dia := (p_end_date::timestamp with time zone AT TIME ZONE 'America/Sao_Paulo')::date;
    ELSE
        end_dia := CURRENT_DATE;
    END IF;

    CREATE TEMP TABLE tmp_mv_sales ON COMMIT DROP AS
    SELECT * FROM mv_sales_daily
    WHERE dia >= start_dia AND dia <= end_dia
      AND loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR loja = p_store);

    CREATE TEMP TABLE tmp_mv_orders ON COMMIT DROP AS
    SELECT * FROM mv_orders_daily
    WHERE dia >= start_dia AND dia <= end_dia
      AND loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR loja = p_store);
      
    SELECT COUNT(DISTINCT customer_id) INTO v_exact_unique_customers
    FROM sales
    WHERE (p_start_date IS NULL OR data >= p_start_date::timestamp with time zone)
      AND (p_end_date IS NULL OR data <= p_end_date::timestamp with time zone)
      AND loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR loja = p_store)
      AND (produto != 'BRLD' OR produto IS NULL);

    SELECT json_build_object(
        'period', json_build_object(
            'startDate', p_start_date,
            'endDate', p_end_date,
            'uniqueCustomers', v_exact_unique_customers
        ),
        'salesMetrics', json_build_object(
            'totalRevenue', COALESCE((SELECT SUM(total_valor) FROM tmp_mv_sales), 0),
            'totalTransactions', COALESCE((SELECT SUM(qtd_vendas) FROM tmp_mv_sales), 0),
            'averageTicket', CASE
                WHEN v_exact_unique_customers > 0 THEN (SELECT SUM(total_valor) FROM tmp_mv_sales) / v_exact_unique_customers
                ELSE 0 END,
            'revenueByDay', COALESCE(
                 (SELECT json_agg(json_build_object('date', dia, 'amount', total_valor))
                  FROM (SELECT dia, SUM(total_valor) as total_valor FROM tmp_mv_sales GROUP BY dia ORDER BY dia ASC) subq),
                 '[]'::json)
        ),
        'machineMetrics', json_build_object(
            'activeCycles', COALESCE((SELECT SUM(qtd_ciclos) FROM tmp_mv_orders), 0),
            'failureRate', 0
        ),
        'storeData', COALESCE(
             (SELECT json_agg(json_build_object(
                 'id', loja,
                 'name', loja,
                 'totalRevenue', total_loja,
                 'lastActive', data_max
             )) FROM (
                 SELECT loja, SUM(total_valor) as total_loja, MAX(dia) as data_max
                 FROM tmp_mv_sales
                 GROUP BY loja ORDER BY total_loja DESC
             ) subq2),
        '[]'::json),
        'basketsMetrics', json_build_object(
            'totalBaskets', COALESCE((SELECT SUM(qtd_ciclos) FROM tmp_mv_orders), 0),
            'totalWashes', COALESCE((SELECT SUM(qtd_ciclos) FROM tmp_mv_orders WHERE upper(service) LIKE '%LAV%' OR upper(service) LIKE '%30 MIN%'), 0),
            'totalDries', COALESCE((SELECT SUM(qtd_ciclos) FROM tmp_mv_orders WHERE upper(service) LIKE '%SEC%' OR upper(service) LIKE '%45 MIN%'), 0),
            'totalOthers', COALESCE((SELECT SUM(qtd_ciclos) FROM tmp_mv_orders WHERE (upper(service) NOT LIKE '%LAV%' AND upper(service) NOT LIKE '%30 MIN%') AND (upper(service) NOT LIKE '%SEC%' AND upper(service) NOT LIKE '%45 MIN%')), 0),
            'unclassifiedList', '[]'::json
        ),
        'paymentStats', COALESCE(
             (SELECT json_agg(json_build_object(
                 'method', forma_pagamento,
                 'valor', val
             )) FROM (
                 SELECT forma_pagamento, SUM(total_valor) as val
                 FROM tmp_mv_sales
                 GROUP BY forma_pagamento
             ) subq3),
        '[]'::json),
        'dailyData', COALESCE(
             (SELECT json_agg(json_build_object(
                 'date', dia,
                 'value', total_valor,
                 'count', qtd_vendas
             )) FROM (
                 SELECT dia, SUM(total_valor) as total_valor, SUM(qtd_vendas) as qtd_vendas
                 FROM tmp_mv_sales
                 GROUP BY dia ORDER BY dia ASC
             ) subq4),
        '[]'::json)
    ) INTO metrics;

    RETURN metrics;
END;
$$;


-- 2. FUNÇÃO CRM
CREATE OR REPLACE FUNCTION get_crm_backend_metrics(p_store text DEFAULT 'Todas', p_start_date text DEFAULT NULL, p_end_date text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    result json;
    v_accessible_stores text[];
    v_uid uuid;
    v_role text;
    v_assigned text[];
    start_dia timestamp with time zone;
    end_dia timestamp with time zone;
BEGIN
    -- [CORREÇÃO RBAC]
    v_uid := auth.uid();
    
    IF v_uid IS NOT NULL THEN
        SELECT role, assigned_stores INTO v_role, v_assigned FROM profiles WHERE id = v_uid;
        IF v_role = 'admin' THEN
            SELECT array_agg(name) INTO v_accessible_stores FROM stores;
        ELSIF v_assigned IS NOT NULL AND array_length(v_assigned, 1) > 0 THEN
            v_accessible_stores := v_assigned;
        ELSE
            v_accessible_stores := ARRAY['NENHUMA_LOJA']::text[];
        END IF;
    ELSE
        SELECT array_agg(name) INTO v_accessible_stores FROM stores;
    END IF;

    start_dia := COALESCE(p_start_date::timestamp with time zone, '2020-01-01'::timestamp with time zone);
    end_dia := COALESCE(p_end_date::timestamp with time zone, CURRENT_TIMESTAMP);

    CREATE TEMP TABLE tmp_heatmap ON COMMIT DROP AS
    SELECT 
        EXTRACT(DOW FROM (data AT TIME ZONE 'America/Sao_Paulo'))::int as dow,
        EXTRACT(HOUR FROM (data AT TIME ZONE 'America/Sao_Paulo'))::int as hod,
        COUNT(DISTINCT CONCAT(id, '-', CAST(EXTRACT(MINUTE FROM data)/3 AS INT))) as count
    FROM sales
    WHERE data >= start_dia AND data <= end_dia
      AND loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR loja = p_store)
      AND cliente != 'CONSUMIDOR FINAL'
      AND cliente != 'PEDIDO BALCÃO'
    GROUP BY dow, hod;

    CREATE TEMP TABLE tmp_period_profiles ON COMMIT DROP AS
    SELECT 
        cliente AS name,
        MAX(telefone) AS phone,
        SUM(valor) AS total_spent,
        COUNT(DISTINCT DATE(data AT TIME ZONE 'America/Sao_Paulo')) AS total_visits,
        MIN(data AT TIME ZONE 'America/Sao_Paulo') AS first_visit,
        MAX(data AT TIME ZONE 'America/Sao_Paulo') AS last_visit,
        SUM(CASE WHEN (upper(produto) LIKE '%LAV%' OR upper(produto) LIKE '%30 MIN%') THEN 1 ELSE 0 END) AS w_count,
        SUM(CASE WHEN (upper(produto) LIKE '%SEC%' OR upper(produto) LIKE '%45 MIN%') THEN 1 ELSE 0 END) AS d_count
    FROM sales
    WHERE data >= start_dia AND data <= end_dia
      AND loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR loja = p_store)
      AND cliente != 'CONSUMIDOR FINAL'
      AND cliente != 'PEDIDO BALCÃO'
      AND upper(cliente) NOT LIKE '%ADMIN%'
      AND upper(cliente) NOT LIKE '%TESTE%'
    GROUP BY cliente;

    CREATE TEMP TABLE tmp_global_profiles ON COMMIT DROP AS
    SELECT 
        cliente AS name,
        MAX(telefone) AS phone,
        SUM(valor) AS total_spent,
        COUNT(DISTINCT DATE(data AT TIME ZONE 'America/Sao_Paulo')) AS total_visits,
        MIN(data AT TIME ZONE 'America/Sao_Paulo') AS first_visit,
        MAX(data AT TIME ZONE 'America/Sao_Paulo') AS last_visit,
        SUM(CASE WHEN (upper(produto) LIKE '%LAV%' OR upper(produto) LIKE '%30 MIN%') THEN 1 ELSE 0 END) AS w_count,
        SUM(CASE WHEN (upper(produto) LIKE '%SEC%' OR upper(produto) LIKE '%45 MIN%') THEN 1 ELSE 0 END) AS d_count
    FROM sales
    WHERE loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR loja = p_store)
      AND cliente != 'CONSUMIDOR FINAL'
      AND cliente != 'PEDIDO BALCÃO'
      AND upper(cliente) NOT LIKE '%ADMIN%'
      AND upper(cliente) NOT LIKE '%TESTE%'
    GROUP BY cliente;

    SELECT json_build_object(
        'heatmap', COALESCE((SELECT json_agg(json_build_object('dow', dow, 'hod', hod, 'count', count)) FROM tmp_heatmap), '[]'::json),
        'periodProfiles', COALESCE((SELECT json_agg(row_to_json(tmp_period_profiles)) FROM tmp_period_profiles), '[]'::json),
        'globalProfiles', COALESCE((SELECT json_agg(row_to_json(tmp_global_profiles)) FROM tmp_global_profiles), '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$;
