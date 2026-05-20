-- =========================================================================
-- LAVLY SaaS - PATCH V41 (ULTIMATE GENDER RECOVERY)
-- 1. Leitura dupla: Prioriza o gênero vindo diretamente da tabela de `sales`
--    (que agora é salvo via ETL da planilha).
-- 2. Fallback: Busca o gênero na tabela `customers` fazendo um JOIN 
--    case-insensitive seguro (UPPER TRIM).
-- =========================================================================

CREATE OR REPLACE FUNCTION get_crm_backend_metrics(p_store text DEFAULT 'Todas', p_start_date text DEFAULT NULL, p_end_date text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
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

    RETURN (
        WITH 
        base_sales AS (
            SELECT 
                cliente,
                telefone,
                valor,
                data AS data_utc,
                (data AT TIME ZONE 'UTC') - interval '3 hours' AS data_brt,
                CASE WHEN produto ILIKE '%LAV%' OR produto ILIKE '%30 MIN%' THEN 1 ELSE 0 END AS is_wash,
                CASE WHEN produto ILIKE '%SEC%' OR produto ILIKE '%45 MIN%' THEN 1 ELSE 0 END AS is_dry,
                CASE WHEN data >= start_dia AND data <= end_dia THEN 1 ELSE 0 END AS in_period,
                birth_date,
                age,
                gender
            FROM sales
            WHERE loja = ANY(v_accessible_stores)
              AND (p_store = 'Todas' OR loja = p_store)
              AND cliente != 'CONSUMIDOR FINAL'
              AND cliente != 'PEDIDO BALCÃO'
              AND cliente NOT ILIKE '%ADMIN%'
              AND cliente NOT ILIKE '%TESTE%'
              AND data >= (CURRENT_DATE - interval '180 days')
        ),
        heatmap_agg AS (
            SELECT 
                EXTRACT(DOW FROM data_brt)::int AS dow,
                EXTRACT(HOUR FROM data_brt)::int AS hod,
                COUNT(*) AS count
            FROM base_sales
            WHERE in_period = 1
            GROUP BY dow, hod
        ),
        base_sales_daily AS (
            SELECT 
                cliente,
                DATE(data_brt) AS visit_date,
                MAX(telefone) AS phone,
                SUM(valor) AS daily_spent,
                MIN(data_brt) AS first_visit_day,
                MAX(data_brt) AS last_visit_day,
                SUM(is_wash) AS d_w_count,
                SUM(is_dry) AS d_d_count,
                MAX(in_period) AS in_period,
                MAX(CASE WHEN data_utc < start_dia THEN data_brt ELSE NULL END) AS last_visit_before_period,
                MAX(birth_date) AS birth_date,
                MAX(age) AS age,
                MAX(CASE WHEN gender IS NOT NULL AND gender != 'U' THEN gender ELSE NULL END) AS gender
            FROM base_sales
            GROUP BY cliente, DATE(data_brt)
        ),
        customer_agg AS (
            SELECT 
                cliente AS name,
                MAX(phone) AS phone,
                SUM(daily_spent) AS g_total_spent,
                COUNT(*) AS g_total_visits,
                MIN(first_visit_day) AS g_first_visit,
                MAX(last_visit_day) AS g_last_visit,
                SUM(d_w_count) AS g_w_count,
                SUM(d_d_count) AS g_d_count,

                SUM(CASE WHEN in_period = 1 THEN daily_spent ELSE 0 END) AS p_total_spent,
                SUM(in_period) AS p_total_visits,
                MIN(CASE WHEN in_period = 1 THEN first_visit_day ELSE NULL END) AS p_first_visit,
                MAX(CASE WHEN in_period = 1 THEN last_visit_day ELSE NULL END) AS p_last_visit,
                SUM(CASE WHEN in_period = 1 THEN d_w_count ELSE 0 END) AS p_w_count,
                SUM(CASE WHEN in_period = 1 THEN d_d_count ELSE 0 END) AS p_d_count,

                MAX(last_visit_before_period) AS last_visit_before_period,
                MAX(birth_date) AS birth_date,
                MAX(age) AS age,
                MAX(gender) AS gender
            FROM base_sales_daily
            GROUP BY cliente
        ),
        gender_agg AS (
            SELECT UPPER(TRIM(name)) AS upper_name, MAX(CASE WHEN gender IS NOT NULL AND gender != 'U' THEN gender ELSE NULL END) AS gender
            FROM customers
            GROUP BY UPPER(TRIM(name))
        ),
        final_profiles AS (
            SELECT ca.*, COALESCE(ca.gender, ga.gender, 'U') AS gender
            FROM customer_agg ca
            LEFT JOIN gender_agg ga ON ga.upper_name = UPPER(TRIM(ca.name))
        )
        SELECT json_build_object(
            'heatmap', COALESCE((SELECT json_agg(t) FROM (SELECT dow, hod, count FROM heatmap_agg) t), '[]'::json),
            'periodProfiles', COALESCE((SELECT json_agg(t) FROM (
                SELECT name, phone, p_total_spent as total_spent, p_total_visits as total_visits, p_first_visit as first_visit, p_last_visit as last_visit, p_w_count as w_count, p_d_count as d_count, last_visit_before_period, gender, age, birth_date
                FROM final_profiles WHERE p_total_visits > 0
            ) t), '[]'::json),
            'globalProfiles', COALESCE((SELECT json_agg(t) FROM (
                SELECT name, phone, g_total_spent as total_spent, g_total_visits as total_visits, g_first_visit as first_visit, g_last_visit as last_visit, g_w_count as w_count, g_d_count as d_count, gender, age, birth_date
                FROM final_profiles
            ) t), '[]'::json)
        )
    );
END;
$$;

ALTER FUNCTION get_crm_backend_metrics(text, text, text) SET statement_timeout = '30s';
