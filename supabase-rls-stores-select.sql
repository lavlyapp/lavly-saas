-- =========================================================================
-- LAVLY SaaS - MULTI-TENANT ARCHITECTURE (RLS STORES SELECT)
-- COPIE E RODE ESTE CÓDIGO NO "SQL EDITOR" DO SUPABASE
-- =========================================================================

-- Para que a Interface (Dashboard) do cliente consiga carregar as informações
-- da própria loja (como horário de funcionamento, endereço que ele vai configurar etc)
-- Nós precisamos permitir que ele faça um SELECT na tabela de lojas, MAS APENAS
-- nas lojas que pertencem a ele.

-- Habilita RLS (caso não esteja, por garantia)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Remove política existente se houver conflito de nome
DROP POLICY IF EXISTS "Usuários podem ver suas próprias lojas" ON public.stores;

-- Cria Política de Leitura Isolada
CREATE POLICY "Usuários podem ver suas próprias lojas" ON public.stores
  FOR SELECT USING (
    public.is_admin()
    OR
    name = ANY (
      ARRAY(SELECT unnest(assigned_stores) FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Garantir que a Role Service (Admin/Backend) sempre pode fazer TUDO na tabela
-- O Supabase Service Role ignoraria o RLS por padrão, mas é boa prática
DROP POLICY IF EXISTS "Service Role Admin Access" ON public.stores;
CREATE POLICY "Service Role Admin Access" ON public.stores
  USING (true)
  WITH CHECK (true);
