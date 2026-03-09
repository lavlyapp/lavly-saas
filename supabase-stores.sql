-- =========================================================================
-- LAVLY SaaS - MULTI-TENANT ARCHITECTURE (FIX 4.2 - INSERIR LOJAS SEM ERRO)
-- COPIE E RODE ESTE CÓDIGO NO "SQL EDITOR" DO SUPABASE
-- =========================================================================

-- O banco acusou erro porque não tem regra de exclusividade no nome da loja.
-- Para contornar isso com segurança, vamos zerar e inserir limpo:

TRUNCATE TABLE public.stores;

INSERT INTO public.stores (name, cnpj, api_key, is_active)
VALUES
  ('Lavateria Cascavel', '43660010000166', 'e8689749-58b1-4a3e-8f1c-11d1a5e2b42e', true),
  ('Lavateria SANTOS DUMONT', '53261645000144', '2bfcb6f6-144b-46c1-8fc3-cef8fbf41729', true),
  ('Lavateria JOSE WALTER', '53261614000193', 'a2862031-5a98-4eb2-8b0a-e7b8cc195263', true),
  ('Lavateria SHOPPING (Maracanau)', '51638594000100', 'f08c45c8-126a-4cb4-ab5d-5c8805c8130f', true),
  ('Lavateria SHOPPING SOLARES', '54539282000129', '68360f6d-fbec-4991-bd2e-c6ff89201e40', true),
  ('Lavateria JOQUEI', '50741565000106', 'cc9c772c-ad36-43a6-a3af-582da70feb07', true);
