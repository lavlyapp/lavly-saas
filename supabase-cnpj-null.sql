-- =========================================================================
-- LAVLY SaaS - MULTI-TENANT ARCHITECTURE (FIX CNPJ NULL CONSTRAINT)
-- COPIE E RODE ESTE CÓDIGO NO "SQL EDITOR" DO SUPABASE
-- =========================================================================

-- A API da VMPay nem sempre retorna o CNPJ quando listamos as máquinas 
-- (endpoint /api/externa/v1/maquinas). Para permitir que a loja seja 
-- "descoberta" e salva no nosso banco de qualquer forma, precisamos
-- remover a obrigatoriedade do CNPJ.

ALTER TABLE public.stores
ALTER COLUMN cnpj DROP NOT NULL;
