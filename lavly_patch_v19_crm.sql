-- =========================================================================
-- V19: OTIMIZAÇÃO CRÍTICA SERVERLESS (CRM)
-- Transformando lógica pesada de Edge Function (100+ requests) em Data-Tier
-- =========================================================================
-- Reduz processamento massivo de JSON Array na Vercel (Crash/Error #310).

CREATE OR REPLACE FUNCTION get_crm_backend_metrics(p_store text DEFAULT 'Todas', p_start_date text DEFAULT NULL, p_end_date text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    result json;
    v_accessible_stores text[];
    start_dia timestamp with time zone;
    end_dia timestamp with time zone;
BEGIN
    SELECT array_agg(name) INTO v_accessible_stores FROM stores;

    -- Timezone Segura (Se não enviado, assume infinito)
    start_dia := COALESCE(p_start_date::timestamp with time zone, '2020-01-01'::timestamp with time zone);
    end_dia := COALESCE(p_end_date::timestamp with time zone, CURRENT_TIMESTAMP);

    -- Heatmap (Somente para o período filtrado)
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

    -- Agrupamento do Período Filtrado (Usado nos Segmentos Wash/Dry)
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

    -- Agrupamento Global (Usado para Top 15 e Churn LTV independente do filtro da UI)
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

    -- Montagem do Payload Final
    SELECT json_build_object(
        'heatmap', COALESCE((SELECT json_agg(json_build_object('dow', dow, 'hod', hod, 'count', count)) FROM tmp_heatmap), '[]'::json),
        'periodProfiles', COALESCE((SELECT json_agg(row_to_json(tmp_period_profiles)) FROM tmp_period_profiles), '[]'::json),
        'globalProfiles', COALESCE((SELECT json_agg(row_to_json(tmp_global_profiles)) FROM tmp_global_profiles), '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$;
