-- Primeiro, limpamos as versões conflitantes (com parâmetros diferentes)
DROP FUNCTION IF EXISTS public.get_financial_dashboard_metrics(text, timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS public.get_financial_dashboard_metrics(text, text, text);

-- Agora criamos a versão definitiva blindada contra o timeout
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
BEGIN
    -- Fix para Nested Loop Explosion do RLS
    SELECT array_agg(name) INTO v_accessible_stores FROM stores;
    
    start_dia := COALESCE(p_start_date::date, '2020-01-01'::date);
    end_dia := COALESCE(p_end_date::date, CURRENT_DATE);

    -- Sales 
    CREATE TEMP TABLE tmp_mv_sales ON COMMIT DROP AS
    SELECT * FROM mv_sales_daily
    WHERE dia >= start_dia AND dia <= end_dia
      AND loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR loja = p_store);

    -- Orders
    CREATE TEMP TABLE tmp_mv_orders ON COMMIT DROP AS
    SELECT * FROM mv_orders_daily
    WHERE dia >= start_dia AND dia <= end_dia
      AND loja = ANY(v_accessible_stores)
      AND (p_store = 'Todas' OR loja = p_store);

    -- Building JSON
    SELECT json_build_object(
        'period', json_build_object(
            'startDate', p_start_date,
            'endDate', p_end_date,
            'uniqueCustomers', 0
        ),
        'salesMetrics', json_build_object(
            'totalRevenue', COALESCE((SELECT SUM(total_valor) FROM tmp_mv_sales), 0),
            'totalTransactions', COALESCE((SELECT SUM(transacoes) FROM tmp_mv_sales), 0),
            'averageTicket', CASE
                WHEN (SELECT SUM(transacoes) FROM tmp_mv_sales) > 0 THEN (SELECT SUM(total_valor) FROM tmp_mv_sales) / (SELECT SUM(transacoes) FROM tmp_mv_sales)
                ELSE 0 END,
            'revenueByDay', COALESCE(
                 (SELECT json_agg(json_build_object('date', dia, 'amount', total_valor))
                  FROM (SELECT dia, SUM(total_valor) as total_valor FROM tmp_mv_sales GROUP BY dia ORDER BY dia ASC) subq),
                 '[]'::json)
        ),
        'machineMetrics', json_build_object(
            'activeCycles', COALESCE((SELECT SUM(qtd_ciclos) FROM tmp_mv_orders), 0),
            'failureRate', CASE
                WHEN (SELECT SUM(qtd_ciclos) FROM tmp_mv_orders) > 0 THEN
                     COALESCE((SELECT SUM(erro_transacao) FROM tmp_mv_orders)::numeric / (SELECT SUM(qtd_ciclos) FROM tmp_mv_orders) * 100, 0)
                ELSE 0 END
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
            'totalWashes', COALESCE((SELECT SUM(qtd_ciclos) FROM tmp_mv_orders WHERE tipo_maquina = 'washer'), 0),
            'totalDries', COALESCE((SELECT SUM(qtd_ciclos) FROM tmp_mv_orders WHERE tipo_maquina = 'dryer'), 0),
            'totalOthers', COALESCE((SELECT SUM(qtd_ciclos) FROM tmp_mv_orders WHERE tipo_maquina = 'custom'), 0),
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
                 'count', transacoes
             )) FROM (
                 SELECT dia, SUM(total_valor) as total_valor, SUM(transacoes) as transacoes
                 FROM tmp_mv_sales
                 GROUP BY dia ORDER BY dia ASC
             ) subq4),
        '[]'::json)
    ) INTO metrics;

    RETURN metrics;
END;
$$;
