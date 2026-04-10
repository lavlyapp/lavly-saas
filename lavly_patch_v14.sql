-- Corrige a função de Refresh para atualizar APENAS as Views reais
CREATE OR REPLACE FUNCTION refresh_dashboard_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Permissão ROOT
AS $$
BEGIN
    BEGIN
        -- Atualiza os dados de forma transparente sem travar o banco
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_daily;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_orders_daily;
    EXCEPTION WHEN OTHERS THEN
        -- Fallback seguro caso as tabelas ainda não tenham unique index configurado
        REFRESH MATERIALIZED VIEW mv_sales_daily;
        REFRESH MATERIALIZED VIEW mv_orders_daily;
    END;
END;
$$;
