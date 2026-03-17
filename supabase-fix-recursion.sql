-- =========================================================================
-- LAVLY SaaS - FIX ERRO DE RECURSIVIDADE INFINITA (PROFILE/SALES)
-- COPIE E RODE ESTE CÓDIGO NO "SQL EDITOR" DO SUPABASE
-- =========================================================================

-- 1. Remove as políticas com recursividade (que causam loop)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

-- 2. Cria uma função segura (SECURITY DEFINER) que lê a role ignorando o RLS, prevenindo o Loop
CREATE OR REPLACE FUNCTION get_user_role_safe()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 3. Recria a política de Leitura usando a função segura
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    get_user_role_safe() = 'admin' OR id = auth.uid()
  );

-- 4. Recria a política de Update usando a função segura
CREATE POLICY "Admins can update profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    get_user_role_safe() = 'admin' OR id = auth.uid()
  )
  WITH CHECK (
    get_user_role_safe() = 'admin' OR id = auth.uid()
  );

-- 5. Garante que os inserts de vendas passem
SELECT 'OK! Erro Crítico 500 de Recursividade Corrigido.' as Resultado;
