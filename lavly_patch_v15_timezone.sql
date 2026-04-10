-- =========================================================================
-- V15: A CURA DO FUSO HORÁRIO BRASILEIRO (AMÉRICA/SAO_PAULO)
-- =========================================================================

-- 1. Destrói as Views corrompidas pelo fuso horário (Naked UTC)
DROP MATERIALIZED VIEW IF EXISTS mv_sales_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_orders_daily CASCADE;

-- 2. Recria a Tabela de Vendas Materializada FORÇANDO o fuso horário Brasileiro (BRT)
CREATE MATERIALIZED VIEW mv_sales_daily AS
SELECT
    DATE(data AT TIME ZONE 'America/Sao_Paulo') as dia,
    loja,
    forma_pagamento,
    SUM(valor) as total_valor,
    COUNT(*) as qtd_vendas,
    COUNT(DISTINCT customer_id) as qtd_clientes
FROM sales
GROUP BY 1, 2, 3;

-- 3. Cria índice ÚNICO obrigatório para o Concurrently Refresh (que Evita travamentos futuros do App)
CREATE UNIQUE INDEX idx_mv_sales_daily_unique 
ON mv_sales_daily (dia, loja, forma_pagamento);

-- 4. Recria a Tabela de Cíclos (Cestos) FORÇANDO o fuso horário Brasileiro (BRT)
CREATE MATERIALIZED VIEW mv_orders_daily AS
SELECT
    DATE(data AT TIME ZONE 'America/Sao_Paulo') as dia,
    loja,
    service,
    COUNT(*) as qtd_ciclos
FROM orders
GROUP BY 1, 2, 3;

-- 5. Cria índice ÚNICO obrigatório para Cestos
CREATE UNIQUE INDEX idx_mv_orders_daily_unique 
ON mv_orders_daily (dia, loja, service);

-- 6. Opcional: Garante que o Refresh Concurrently Funcione sem fantasmas
CREATE OR REPLACE FUNCTION refresh_dashboard_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_daily;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_orders_daily;
    EXCEPTION WHEN OTHERS THEN
        REFRESH MATERIALIZED VIEW mv_sales_daily;
        REFRESH MATERIALIZED VIEW mv_orders_daily;
    END;
END;
$$;
