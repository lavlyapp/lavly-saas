-- =========================================================================
-- LAVLY SaaS - MULTI-TENANT ARCHITECTURE (ADD VMPAY API KEY)
-- COPIE E RODE ESTE CÓDIGO NO "SQL EDITOR" DO SUPABASE
-- =========================================================================

-- 1. Adicionar a coluna vmpay_api_key à tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS vmpay_api_key text;

-- 2. Garantir que as tabelas de vendas/pedidos já tenham a coluna de api_key se não existir
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS api_key text;

-- (As políticas RLS já existentes de profiles aplicam-se à nova coluna)
