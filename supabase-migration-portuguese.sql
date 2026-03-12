-- =========================================================================
-- LAVLY SaaS - MIGRAÇÃO DE NÍVEIS (PORTUGUÊS) E LIMITE DE LOJAS
-- COPIE E RODE ESTE CÓDIGO NO "SQL EDITOR" DO SUPABASE
-- =========================================================================

-- 1. Remove a Constraint Atual (pois ela proíbe palavras em português)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Atualiza os usuários existentes para a nomenclatura nova
UPDATE public.profiles SET role = 'admin' WHERE role = 'admin';
UPDATE public.profiles SET role = 'proprietario' WHERE role = 'owner';
UPDATE public.profiles SET role = 'atendente' WHERE role = 'attendant';

-- 3. Recria a Constraint com os nomes em português
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'proprietario', 'atendente'));

-- 4. Altera o valor DEFAULT da coluna para novos cadastros
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'proprietario';

-- 5. Adiciona a coluna de LIMITE DE LOJAS (max_stores)
-- Inicia com 1 para todo mundo (para não quebrar). O Admin depois aumenta conforme o cliente paga.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_stores integer NOT NULL DEFAULT 1;

-- Mensagem de Sucesso
SELECT 'Migração concluída com sucesso!' as status;
