
CREATE OR REPLACE FUNCTION get_financial_dashboard_metrics(
    p_store text,
    p_start_date timestamp with time zone,
    p_end_date timestamp with time zone
) RETURNS json LANGUAGE plpgsql AS $$
DECLARE
    res json;
BEGIN
    DROP TABLE IF EXISTS tmp_sales;
    DROP TABLE IF EXISTS tmp_orders;

    CREATE TEMP TABLE tmp_sales AS
    SELECT loja, valor, data, forma_pagamento, customer_id
    FROM sales
    WHERE (p_store = 'Todas' OR loja = p_store) 
      AND (p_start_date IS NULL OR data >= p_start_date)
      AND (p_end_date IS NULL OR data <= p_end_date)
      AND (produto != 'BRLD' OR produto IS NULL);

    CREATE TEMP TABLE tmp_orders AS
    SELECT service
    FROM orders
    WHERE (p_store = 'Todas' OR loja = p_store)
      AND (p_start_date IS NULL OR data >= p_start_date)
      AND (p_end_date IS NULL OR data <= p_end_date);

    SELECT json_build_object(
        'salesMetrics', (
            SELECT json_build_object(
                'totalRevenue', COALESCE(SUM(valor), 0),
                'totalTransactions', COUNT(*),
                'averageTicket', CASE WHEN COUNT(*) > 0 THEN SUM(valor)/COUNT(*) ELSE 0 END
            )
            FROM tmp_sales 
        ),
        
        'period', (
            SELECT json_build_object(
                'startDate', MIN(data),
                'endDate', MAX(data),
                'uniqueCustomers', COUNT(DISTINCT customer_id)
            )
            FROM tmp_sales
        ),
        
        'storeData', COALESCE((
            SELECT json_agg(json_build_object('name', l, 'valor', v))
            FROM (
                SELECT COALESCE(loja, 'Desconhecida') as l, SUM(valor) as v
                FROM tmp_sales
                GROUP BY 1
                ORDER BY 2 DESC
            ) sub
        ), '[]'::json),

        'dailyData', COALESCE((
            SELECT json_agg(json_build_object('date', d, 'valor', v))
            FROM (
                SELECT to_char(data AT TIME ZONE 'UTC-3', 'DD/MM/YYYY') as d, SUM(valor) as v
                FROM tmp_sales
                GROUP BY 1
                ORDER BY MIN(data)
            ) sub
        ), '[]'::json),

        'paymentStats', COALESCE((
            SELECT json_agg(json_build_object('method', m, 'valor', v))
            FROM (
                SELECT COALESCE(forma_pagamento, 'Desconhecida') as m, SUM(valor) as v
                FROM tmp_sales
                GROUP BY 1
                ORDER BY 2 DESC
            ) sub
        ), '[]'::json),
        
        'basketsMetrics', (
            SELECT json_build_object(
                'totalBaskets', COUNT(*),
                'totalWashes', COUNT(*) FILTER (WHERE lower(service) LIKE '%lavagem%' OR lower(service) LIKE '%cesto azul%' OR lower(service) LIKE '%suave%' OR lower(service) LIKE '%pesada%'),
                'totalDries', COUNT(*) FILTER (WHERE lower(service) LIKE '%secagem%' OR lower(service) LIKE '%secar%'),
                'totalOthers', COUNT(*) FILTER (WHERE lower(service) NOT LIKE '%lavagem%' AND lower(service) NOT LIKE '%cesto azul%' AND lower(service) NOT LIKE '%suave%' AND lower(service) NOT LIKE '%pesada%' AND lower(service) NOT LIKE '%secagem%' AND lower(service) NOT LIKE '%secar%'),
                'unclassifiedList', '[]'::json
            )
            FROM tmp_orders
        )
    ) INTO res;
    
    DROP TABLE IF EXISTS tmp_sales;
    DROP TABLE IF EXISTS tmp_orders;
    
    RETURN res;
END;
$$;
    