-- =========================================================================
-- V20: CORREÇÃO DE ISOLAMENTO DE DADOS (TENANT RBAC)
-- Corrige o vazamento de lojas entre usuários que não possuem RLS ativado na tabela stores
-- =========================================================================

CREATE OR REPLACE FUNCTION get_financial_dashboard_metrics(p_store text DEFAULT 'Todas', p_start_date text DEFAULT NULL, p_end_date text DEFAULT NULL)
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
        -- Fallback para Cron Jobs rodando via Service Role Key
        SELECT array_agg(name) INTO v_accessible_stores FROM stores;
    END IF;

    -- Timezone Segura (Se não enviado, assume infinito)
    start_dia := COALESCE(p_start_date::timestamp with time zone, '2020-01-01'::timestamp with time zone);
    end_dia := COALESCE(p_end_date::timestamp with time zone, CURRENT_TIMESTAMP);

    -- Base Unificada: Apenas Vendas Válidas dentro do escopo de Lojas Permitidas
    CREATE TEMP TABLE tmp_mv_sales ON COMMIT DROP AS
    SELECT * FROM sales
    WHERE data >= start_dia AND data <= end_dia
      AND loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR loja = p_store)
      AND forma_pagamento != 'TIPO DESCONHECIDO'
      AND cliente != 'CONSUMIDOR FINAL'
      AND cliente != 'PEDIDO BALCÃO'
      AND upper(cliente) NOT LIKE '%ADMIN%'
      AND upper(cliente) NOT LIKE '%TESTE%';

    -- O restante da função financeira permanece com a lógica de agregação...
    SELECT json_build_object(
        'salesMetrics', COALESCE(
            (SELECT json_build_object(
                'totalRevenue', SUM(valor),
                'totalTransactions', COUNT(id),
                'totalCustomers', COUNT(DISTINCT cliente),
                'averageTicket', CASE WHEN COUNT(DISTINCT cliente) > 0 THEN SUM(valor) / COUNT(DISTINCT cliente) ELSE 0 END,
                'totalBaskets', COUNT(*)
            ) FROM tmp_mv_sales),
            '{"totalRevenue":0,"totalTransactions":0,"totalCustomers":0,"averageTicket":0,"totalBaskets":0}'::json
        ),
        'dailyData', COALESCE(
             (SELECT json_agg(json_build_object(
                 'date', dia,
                 'value', total_valor,
                 'count', qtd_vendas
             )) FROM (
                 SELECT to_char(data AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') as dia,
                        SUM(valor) as total_valor,
                        COUNT(id) as qtd_vendas
                 FROM tmp_mv_sales
                 GROUP BY dia
                 ORDER BY dia ASC
             ) sub),
             '[]'::json
        ),
        'storeData', COALESCE(
             (SELECT json_agg(json_build_object(
                 'id', loja,
                 'name', loja,
                 'totalRevenue', total_loja,
                 'lastActive', data_max
             )) FROM (
                 SELECT loja, 
                        SUM(valor) as total_loja,
                        MAX(data) as data_max
                 FROM tmp_mv_sales
                 GROUP BY loja
                 ORDER BY total_loja DESC
             ) sub),
             '[]'::json
        ),
        'paymentStats', COALESCE(
             (SELECT json_agg(json_build_object(
                 'method', forma_pagamento,
                 'valor', val
             )) FROM (
                 SELECT forma_pagamento, SUM(valor) as val
                 FROM tmp_mv_sales
                 GROUP BY forma_pagamento
             ) sub),
             '[]'::json
        )
    ) INTO result;

    RETURN result;
END;
$$;


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
