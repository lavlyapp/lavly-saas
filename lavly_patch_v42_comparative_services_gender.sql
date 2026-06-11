-- =============================================================
-- LAVLY PATCH v42 — Comparativo: Volume de Serviços + Gênero
-- - Adiciona washes/dries mensais (mv_orders_daily)
-- - Adiciona contagem mensal de clientes por gênero (M/F)
-- - Mantém monthlyStats e heatmap existentes
-- =============================================================

CREATE OR REPLACE FUNCTION get_comparative_financial_metrics(
    p_store text,
    p_start_date timestamp with time zone,
    p_end_date timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    v_accessible_stores text[];
    v_uid uuid;
    v_role text;
    v_assigned text[];
    v_start_dia date;
    v_end_dia date;
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

    v_start_dia := DATE(p_start_date AT TIME ZONE 'America/Sao_Paulo');
    v_end_dia   := DATE(p_end_date   AT TIME ZONE 'America/Sao_Paulo');

    -- Temporary table filtered and converted to BRT once
    CREATE TEMP TABLE tmp_filtered_comp ON COMMIT DROP AS
    SELECT
        valor,
        cliente,
        (data AT TIME ZONE 'America/Sao_Paulo') AS date_brt
    FROM sales
    WHERE data >= p_start_date AND data <= p_end_date
      AND loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR loja = p_store);

    CREATE TEMP TABLE tmp_monthly_stats ON COMMIT DROP AS
    SELECT
        TO_CHAR(date_brt, 'YYYY-MM') AS year_month,
        COALESCE(SUM(valor), 0) AS revenue,
        COUNT(*) AS transactions,
        COUNT(DISTINCT NULLIF(cliente, 'Consumidor Final')) AS unique_customers
    FROM tmp_filtered_comp
    GROUP BY year_month
    ORDER BY year_month ASC;

    CREATE TEMP TABLE tmp_heatmap ON COMMIT DROP AS
    SELECT
        EXTRACT(DOW FROM date_brt) AS dow,
        CEIL(EXTRACT(DAY FROM date_brt) / 7.0) AS week_of_month,
        COALESCE(SUM(valor), 0) AS total
    FROM tmp_filtered_comp
    GROUP BY dow, week_of_month;

    -- NOVO v42: Volume de serviços mensal (lavagens vs secagens)
    CREATE TEMP TABLE tmp_services ON COMMIT DROP AS
    SELECT
        TO_CHAR(dia, 'YYYY-MM') AS year_month,
        COALESCE(SUM(qtd_ciclos) FILTER (WHERE upper(service) LIKE '%LAV%' OR upper(service) LIKE '%30 MIN%'), 0) AS washes,
        COALESCE(SUM(qtd_ciclos) FILTER (WHERE upper(service) LIKE '%SEC%' OR upper(service) LIKE '%45 MIN%'), 0) AS dries
    FROM mv_orders_daily
    WHERE dia >= v_start_dia AND dia <= v_end_dia
      AND loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR loja = p_store)
    GROUP BY 1;

    -- NOVO v42: Clientes únicos por gênero por mês
    CREATE TEMP TABLE tmp_gender ON COMMIT DROP AS
    SELECT
        TO_CHAR(s.data AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS year_month,
        COUNT(DISTINCT s.customer_id) FILTER (WHERE upper(c.gender) = 'M') AS males,
        COUNT(DISTINCT s.customer_id) FILTER (WHERE upper(c.gender) = 'F') AS females
    FROM sales s
    JOIN customers c ON c.customer_id = s.customer_id
    WHERE s.data >= p_start_date AND s.data <= p_end_date
      AND s.loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR s.loja = p_store)
    GROUP BY 1;

    SELECT json_build_object(
        'monthlyStats', COALESCE((SELECT json_agg(row_to_json(tmp_monthly_stats)) FROM tmp_monthly_stats), '[]'::json),
        'heatmap',      COALESCE((SELECT json_agg(row_to_json(tmp_heatmap)) FROM tmp_heatmap), '[]'::json),
        'services',     COALESCE((SELECT json_agg(row_to_json(tmp_services)) FROM tmp_services), '[]'::json),
        'gender',       COALESCE((SELECT json_agg(row_to_json(tmp_gender)) FROM tmp_gender), '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$;
