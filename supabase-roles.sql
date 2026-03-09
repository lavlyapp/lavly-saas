-- =========================================================================
-- LAVLY SaaS - MULTI-TENANT ARCHITECTURE (DEFINIR ACESSOS - CORREÇÃO LOJAS)
-- COPIE E RODE ESTE CÓDIGO NO "SQL EDITOR" DO SUPABASE
-- =========================================================================

-- 1. Promover o email do Lavly para ADMIN supremo (vê tudo de todos)
INSERT INTO public.profiles (id, role, assigned_stores, subscription_status)
SELECT id, 'admin', '{}', 'active'
FROM auth.users
WHERE email = 'lavlyapp@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin', assigned_stores = '{}';

-- 2. Limitar o seu e-mail pessoal como OWNER para as suas 6 LOJAS EXATAS
INSERT INTO public.profiles (id, role, assigned_stores, subscription_status)
SELECT id, 'owner', ARRAY[
  'Lavateria Cascavel',
  'Lavateria BEZERRA MENEZES', -- Alias para Cascavel no VMPay
  'Lavateria SANTOS DUMONT',
  'Lavateria JOSE WALTER',
  'Lavateria SHOPPING (Maracanau)',
  'Lavateria SHOPPING SOLARES',
  'Lavateria JOQUEI'
], 'active'
FROM auth.users
WHERE email = 'eduardofbmoura@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = 'owner', assigned_stores = ARRAY[
  'Lavateria Cascavel',
  'Lavateria BEZERRA MENEZES',
  'Lavateria SANTOS DUMONT',
  'Lavateria JOSE WALTER',
  'Lavateria SHOPPING (Maracanau)',
  'Lavateria SHOPPING SOLARES',
  'Lavateria JOQUEI'
];
