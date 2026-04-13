-- Lavly V23 Patch: Comparative Financial Aggregation Native RPC
-- This RPC executes a grouped 12-month historical scan on the database server to prevent browser freezing.

CREATE OR REPLACE FUNCTION public.get_comparative_financial_metrics(
    p_store text,
    p_start_date timestamptz,
    p_end_date timestamptz
) RETURNS json AS $$
DECLARE
    result json;
BEGIN
    -- Temporary table for accessible stores logic
    CREATE TEMP TABLE v_accessible_stores ON COMMIT DROP AS
    SELECT store_name FROM get_accessible_stores(auth.uid());

    IF p_store != 'Todas' THEN
        DELETE FROM v_accessible_stores WHERE store_name != p_store;
    END IF;

    -- Aggregate monthly stats dynamically
    CREATE TEMP TABLE tmp_monthly_stats ON COMMIT DROP AS
    SELECT 
        TO_CHAR(timezone('America/Fortaleza', data), 'YYYY-MM') AS year_month,
        COALESCE(SUM(valor), 0) AS revenue,
        COUNT(*) AS transactions,
        COUNT(DISTINCT NULLIF(cliente, 'Consumidor Final')) AS unique_customers
    FROM sales s
    JOIN v_accessible_stores vas ON s.loja = vas.store_name
    WHERE s.data >= p_start_date AND s.data <= p_end_date
    GROUP BY year_month
    ORDER BY year_month ASC;

    -- Aggregate heatmap dynamically based on identical bounds
    CREATE TEMP TABLE tmp_heatmap ON COMMIT DROP AS
    SELECT 
        EXTRACT(DOW FROM timezone('America/Fortaleza', data)) AS dow,
        CEIL(EXTRACT(DAY FROM timezone('America/Fortaleza', data)) / 7.0) AS week_of_month,
        COALESCE(SUM(valor), 0) AS total
    FROM sales s
    JOIN v_accessible_stores vas ON s.loja = vas.store_name
    WHERE s.data >= p_start_date AND s.data <= p_end_date
    GROUP BY dow, week_of_month;

    -- Compile JSON Payload
    SELECT json_build_object(
        'monthlyStats', COALESCE((SELECT json_agg(row_to_json(tmp_monthly_stats)) FROM tmp_monthly_stats), '[]'::json),
        'heatmap', COALESCE((SELECT json_agg(row_to_json(tmp_heatmap)) FROM tmp_heatmap), '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
