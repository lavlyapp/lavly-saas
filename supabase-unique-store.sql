-- =========================================================================
-- LAVLY SaaS - MULTI-TENANT ARCHITECTURE (FIX STORES UNIQUE CONSTRAINT)
-- COPIE E RODE ESTE CÓDIGO NO "SQL EDITOR" DO SUPABASE
-- =========================================================================

-- Para permitir o 'upsert' automático de lojas durante o convite,
-- a coluna 'name' precisa ser única no banco de dados.

ALTER TABLE public.stores
ADD CONSTRAINT stores_name_key UNIQUE (name);
