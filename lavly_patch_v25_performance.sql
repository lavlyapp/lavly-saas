-- =========================================================================
-- LAVLY SaaS - PATCH V25 (PERFORMANCE & INDEXES)
-- Resolve "canceling statement due to statement timeout" na Vercel
-- =========================================================================

-- 1. Criar Índices de Alta Performance para o JOIN de Texto
-- Isso resolve instantaneamente o erro de Timeout nas páginas de CRM
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (name);
CREATE INDEX IF NOT EXISTS idx_sales_cliente ON public.sales (cliente);
CREATE INDEX IF NOT EXISTS idx_sales_data ON public.sales (data);
CREATE INDEX IF NOT EXISTS idx_sales_loja ON public.sales (loja);

-- Para garantir que o otimizador do Banco use os índices recém-criados
ANALYZE public.customers;
ANALYZE public.sales;
