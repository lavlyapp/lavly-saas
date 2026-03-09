-- =========================================================================
-- LAVLY SaaS - MULTI-TENANT ARCHITECTURE MIGRATION (FIX 2 - COLUNAS)
-- COPIE E RODE ESTE CÓDIGO NO "SQL EDITOR" DO SUPABASE
-- =========================================================================

-- Como a sua tabela "profiles" já existia no banco desde o passado, 
-- o script original apenas ignorou a criação por causa do "IF NOT EXISTS".
-- O código abaixo força a inclusão das colunas novas que o Lavly precisa agora!

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role text not null default 'owner' check (role in ('admin', 'owner', 'attendant')),
  ADD COLUMN IF NOT EXISTS assigned_stores text[] default '{}',
  ADD COLUMN IF NOT EXISTS subscription_status text default 'active';
