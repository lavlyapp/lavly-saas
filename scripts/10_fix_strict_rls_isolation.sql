-- REVOGAÇÃO DE PERMISSÕES GLOBAIS (ISOLAMENTO MULTI-TENANT)
-- Copie este código e cole no SQL Editor do seu Supabase, depois clique em "Run".

-- 1. Garante que o RLS está ativado
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 2. DERRUBAR A POLÍTICA PERIGOSA QUE DAVA ACESSO TOTAL A TODOS OS USUÁRIOS
DROP POLICY IF EXISTS "SuperAdmin Full Access Sales" ON public.sales;
DROP POLICY IF EXISTS "SuperAdmin Full Access Orders" ON public.orders;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.sales;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.orders;

-- 3. CRIAR NOVA POLÍTICA DE LEITURA (SELECT) ESTRITA BASEADA NO PERFIL DO USUÁRIO
-- Regra Vendas: O usuário só pode baixar vendas onde a 'loja' está dentro do array 'assigned_stores' do seu perfil, OU se o cargo dele for 'admin'.
CREATE POLICY "Strict Tenant Read Access Sales" ON public.sales
FOR SELECT TO authenticated 
USING (
    loja IN (SELECT unnest(assigned_stores) FROM public.profiles WHERE id = auth.uid()) 
    OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Regra Pedidos: O mesmo isolamento, mas avaliando a tabela orders.
CREATE POLICY "Strict Tenant Read Access Orders" ON public.orders
FOR SELECT TO authenticated 
USING (
    loja IN (SELECT unnest(assigned_stores) FROM public.profiles WHERE id = auth.uid()) 
    OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- OS SISTEMAS DE IMPORTAÇÃO (VERCEL E CRON JOBS) VÃO USAR A 'SERVICE_ROLE_KEY' 
-- QUE IGNORA O RLS NATURALMENTE, PORTANTO NÃO PRECISAMOS DE POLÍTICAS DE `INSERT` PARA USUÁRIOS COMUNS!

SELECT 'Segurança Restabelecida! Apenas os administradores podem ver todas as lojas. Usuários só veem suas franquias.' as status;
