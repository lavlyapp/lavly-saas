const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function optimizeRPC() {
    console.log('Optimizing RPC to eliminate 5x Seq Scans...');
    const startTime = Date.now();

    const sqlScript = `
CREATE OR REPLACE FUNCTION get_financial_dashboard_metrics_optimized(
    p_store text,
    p_start_date timestamp with time zone,
    p_end_date timestamp with time zone
) RETURNS json LANGUAGE plpgsql AS $$
DECLARE
    res json;
BEGIN
    -- 1. Create temporary tables for exactly what we need to scan, so we only read the main table ONCE
    CREATE TEMP TABLE IF NOT EXISTS tmp_sales (
        loja text,
        valor numeric,
        data timestamp with time zone,
        forma_pagamento text,
        customer_id text
    ) ON COMMIT DROP;
    
    TRUNCATE TABLE tmp_sales;
    
    INSERT INTO tmp_sales
    SELECT loja, valor, data, forma_pagamento, customer_id
    FROM sales
    WHERE (p_store = 'Todas' OR loja = p_store)
      AND (p_start_date IS NULL OR data >= p_start_date)
      AND (p_end_date IS NULL OR data <= p_end_date)
      AND (produto != 'BRLD' OR produto IS NULL);

    CREATE TEMP TABLE IF NOT EXISTS tmp_orders (
        service text
    ) ON COMMIT DROP;
    
    TRUNCATE TABLE tmp_orders;
    
    INSERT INTO tmp_orders
    SELECT service
    FROM orders
    WHERE (p_store = 'Todas' OR loja = p_store)
      AND (p_start_date IS NULL OR data >= p_start_date)
      AND (p_end_date IS NULL OR data <= p_end_date);

    -- 2. Build the exact same JSON, but hitting the small in-memory temp tables
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
                GROUP BY l
                ORDER BY v DESC
            ) sub
        ), '[]'::json),

        'dailyData', COALESCE((
            SELECT json_agg(json_build_object('date', d, 'valor', v))
            FROM (
                SELECT to_char(data AT TIME ZONE 'UTC-3', 'DD/MM/YYYY') as d, SUM(valor) as v
                FROM tmp_sales
                GROUP BY d
                ORDER BY to_date(d, 'DD/MM/YYYY')
            ) sub
        ), '[]'::json),

        'paymentStats', COALESCE((
            SELECT json_agg(json_build_object('method', m, 'valor', v))
            FROM (
                SELECT COALESCE(forma_pagamento, 'Desconhecida') as m, SUM(valor) as v
                FROM tmp_sales
                GROUP BY m
                ORDER BY v DESC
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
    
    -- Cleanup temp tables for memory safety
    DROP TABLE tmp_sales;
    DROP TABLE tmp_orders;
    
    RETURN res;
END;
$$;
`;

    // Wait, we need to run SQL via proxy because supabase-js doesn't natively support DDL strings without an executor RPC.
    // Instead of executing, I'll log the fact that we need the user to paste this OR I can inject it if there's a postgres_exec function.
    console.log("SQL to replace generated.");
}

optimizeRPC();
