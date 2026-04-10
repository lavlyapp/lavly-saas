-- Limpando resquícios para evitar conflitos de overload
DROP FUNCTION IF EXISTS public.get_financial_dashboard_metrics(text, timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS public.get_financial_dashboard_metrics(text, text, text);

-- Arquitetura Lambda V12: Otimizada com Alinhamento Estrito de Colunas e Tipos (Proteção UNION ALL)
CREATE OR REPLACE FUNCTION get_financial_dashboard_metrics(p_store text DEFAULT 'Todas', p_start_date text DEFAULT NULL, p_end_date text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    metrics json;
    start_dia timestamp;
    end_dia timestamp;
    v_accessible_stores text[];
BEGIN
    SELECT array_agg(name) INTO v_accessible_stores FROM stores;
    
    start_dia := COALESCE(p_start_date::timestamp, '2020-01-01 00:00:00'::timestamp);
    end_dia := COALESCE(p_end_date::timestamp + interval '1 day' - interval '1 second', CURRENT_DATE + interval '1 day' - interval '1 second');

    -- SALES: Speed Layer + Batch Layer com alinhamento seguro
    CREATE TEMP TABLE tmp_mv_sales ON COMMIT DROP AS
    SELECT dia::text, loja::text, forma_pagamento::text, total_valor::numeric, qtd_vendas::numeric, qtd_clientes::numeric 
    FROM mv_sales_daily
    WHERE dia::date >= start_dia::date AND dia::date < CURRENT_DATE
      AND loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR loja = p_store)
    UNION ALL
    SELECT data::date::text as dia, loja::text, forma_pagamento::text, sum(valor)::numeric as total_valor, count(*)::numeric as qtd_vendas, count(distinct customer_id)::numeric as qtd_clientes
    FROM sales
    WHERE data >= CURRENT_DATE AND data <= end_dia AND data >= start_dia
      AND loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR loja = p_store)
    GROUP BY data::date, loja, forma_pagamento;

    -- ORDERS: Speed Layer + Batch Layer com alinhamento seguro
    CREATE TEMP TABLE tmp_mv_orders ON COMMIT DROP AS
    SELECT dia::text, loja::text, service::text, qtd_ciclos::numeric 
    FROM mv_orders_daily
    WHERE dia::date >= start_dia::date AND dia::date < CURRENT_DATE
      AND loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR loja = p_store)
    UNION ALL
    SELECT data::date::text as dia, loja::text, service::text, count(*)::numeric as qtd_ciclos
    FROM orders
    WHERE data >= CURRENT_DATE AND data <= end_dia AND data >= start_dia
      AND loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR loja = p_store)
    GROUP BY data::date, loja, service;

    SELECT json_build_object(
        'period', json_build_object(
            'startDate', p_start_date,
            'endDate', p_end_date,
            'uniqueCustomers', COALESCE((SELECT SUM(qtd_clientes) FROM tmp_mv_sales), 0)
        ),
        'salesMetrics', json_build_object(
            'totalRevenue', COALESCE((SELECT SUM(total_valor) FROM tmp_mv_sales), 0),
            'totalTransactions', COALESCE((SELECT SUM(qtd_vendas) FROM tmp_mv_sales), 0),
            'averageTicket', CASE
                WHEN (SELECT SUM(qtd_vendas) FROM tmp_mv_sales) > 0 THEN (SELECT SUM(total_valor) FROM tmp_mv_sales) / (SELECT SUM(qtd_vendas) FROM tmp_mv_sales)
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
                 GROUP BY loja
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
