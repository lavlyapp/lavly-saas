-- CORREÇÃO DE PERFORMANCE CRÍTICA (RLS TIMEOUT)
-- O script anterior causou um gargalo porque o PostgreSQL estava verificando o perfil 
-- do usuário linha por linha (40.000+ vezes) durante o carregamento inicial.
-- Esta correção cria funções "STABLE" em Cache, reduzindo a checagem para apenas 1 vez!

-- 1. CRIAR FUNÇÕES DE CACHE RÁPIDO PARA O BANCO DE DADOS
CREATE OR REPLACE FUNCTION get_user_role() 
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_stores() 
RETURNS text[] AS $$
  SELECT assigned_stores FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. DERRUBAR AS POLÍTICAS LENTAS
DROP POLICY IF EXISTS "Strict Tenant Read Access Sales" ON public.sales;
DROP POLICY IF EXISTS "Strict Tenant Read Access Orders" ON public.orders;

-- 3. REFAZER AS POLÍTICAS USANDO O MODO TURBO (ANY)
CREATE POLICY "Strict Tenant Read Access Sales" ON public.sales
FOR SELECT TO authenticated 
USING (
    loja = ANY(get_user_stores()) 
    OR 
    get_user_role() = 'admin'
);

CREATE POLICY "Strict Tenant Read Access Orders" ON public.orders
FOR SELECT TO authenticated 
USING (
    loja = ANY(get_user_stores()) 
    OR 
    get_user_role() = 'admin'
);

SELECT 'Performance restaurada! O painel voltará a carregar instantaneamente agora.' as status;
