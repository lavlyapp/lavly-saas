-- =========================================================================
-- LAVLY SaaS - PATCH V26 (ULTIMATE QUERY OPTIMIZER & TIMEOUT KILLER)
-- Reescreve o motor do CRM para agregar 100% das vendas PRIMEIRO (em O(N)),
-- e só então anexar os dados do cadastro via JOIN (em O(1)), cortando
-- a explosão cartesiana (Cartesian Product) que causava o Erro 500.
-- =========================================================================

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

    -- Heatmap (não possui JOIN)
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

    -- [OTIMIZAÇÃO MASSIVA] Agrupamento Prévio (Pre-Aggregation) no Período
    CREATE TEMP TABLE tmp_period_sales ON COMMIT DROP AS
    SELECT 
        s.cliente AS name,
        MAX(s.telefone) AS phone,
        SUM(s.valor) AS total_spent,
        COUNT(DISTINCT DATE(s.data AT TIME ZONE 'America/Sao_Paulo')) AS total_visits,
        MIN(s.data AT TIME ZONE 'America/Sao_Paulo') AS first_visit,
        MAX(s.data AT TIME ZONE 'America/Sao_Paulo') AS last_visit,
        SUM(CASE WHEN (upper(s.produto) LIKE '%LAV%' OR upper(s.produto) LIKE '%30 MIN%') THEN 1 ELSE 0 END) AS w_count,
        SUM(CASE WHEN (upper(s.produto) LIKE '%SEC%' OR upper(s.produto) LIKE '%45 MIN%') THEN 1 ELSE 0 END) AS d_count
    FROM sales s
    WHERE s.data >= start_dia AND s.data <= end_dia
      AND s.loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR s.loja = p_store)
      AND s.cliente != 'CONSUMIDOR FINAL'
      AND s.cliente != 'PEDIDO BALCÃO'
      AND upper(s.cliente) NOT LIKE '%ADMIN%'
      AND upper(s.cliente) NOT LIKE '%TESTE%'
    GROUP BY s.cliente;

    CREATE TEMP TABLE tmp_period_profiles ON COMMIT DROP AS
    SELECT 
        ps.*,
        COALESCE(
           (SELECT c.gender FROM customers c WHERE c.name = ps.name AND c.gender IS NOT NULL AND c.gender != 'U' ORDER BY c.vmpay_id DESC LIMIT 1), 
           'U'
        ) AS gender
    FROM tmp_period_sales ps;

    -- [OTIMIZAÇÃO MASSIVA] Agrupamento Prévio (Pre-Aggregation) Global
    CREATE TEMP TABLE tmp_global_sales ON COMMIT DROP AS
    SELECT 
        s.cliente AS name,
        MAX(s.telefone) AS phone,
        SUM(s.valor) AS total_spent,
        COUNT(DISTINCT DATE(s.data AT TIME ZONE 'America/Sao_Paulo')) AS total_visits,
        MIN(s.data AT TIME ZONE 'America/Sao_Paulo') AS first_visit,
        MAX(s.data AT TIME ZONE 'America/Sao_Paulo') AS last_visit,
        SUM(CASE WHEN (upper(s.produto) LIKE '%LAV%' OR upper(s.produto) LIKE '%30 MIN%') THEN 1 ELSE 0 END) AS w_count,
        SUM(CASE WHEN (upper(s.produto) LIKE '%SEC%' OR upper(s.produto) LIKE '%45 MIN%') THEN 1 ELSE 0 END) AS d_count
    FROM sales s
    WHERE s.loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR s.loja = p_store)
      AND s.cliente != 'CONSUMIDOR FINAL'
      AND s.cliente != 'PEDIDO BALCÃO'
      AND upper(s.cliente) NOT LIKE '%ADMIN%'
      AND upper(s.cliente) NOT LIKE '%TESTE%'
    GROUP BY s.cliente;

    CREATE TEMP TABLE tmp_global_profiles ON COMMIT DROP AS
    SELECT 
        gs.*,
        COALESCE(
           (SELECT c.gender FROM customers c WHERE c.name = gs.name AND c.gender IS NOT NULL AND c.gender != 'U' ORDER BY c.vmpay_id DESC LIMIT 1), 
           'U'
        ) AS gender
    FROM tmp_global_sales gs;

    SELECT json_build_object(
        'heatmap', COALESCE((SELECT json_agg(json_build_object('dow', dow, 'hod', hod, 'count', count)) FROM tmp_heatmap), '[]'::json),
        'periodProfiles', COALESCE((SELECT json_agg(row_to_json(tmp_period_profiles)) FROM tmp_period_profiles), '[]'::json),
        'globalProfiles', COALESCE((SELECT json_agg(row_to_json(tmp_global_profiles)) FROM tmp_global_profiles), '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$;
