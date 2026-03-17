-- =========================================================================
-- LAVLY SaaS - FIX PERMISSÕES LAVLY ADMIN (DASHBOARD)
-- COPIE E RODE ESTE CÓDIGO NO "SQL EDITOR" DO SUPABASE
-- =========================================================================

-- 1. Garante que a tabela tem RLS ativado (já deve ter, mas por precaução)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Remove qualquer diretriz anterior que impedia admin de ver todos
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 3. Cria a permissão para os perfis com role 'admin' poderem ler toda a tabela 'profiles'
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 4. Opcional (Mas recomendado): Permitir que admin atualize as roles dos outros
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Mensagem de confirmação
SELECT 'OK! Políticas de acesso de ADMIN configuradas com sucesso.' as Resultado;
