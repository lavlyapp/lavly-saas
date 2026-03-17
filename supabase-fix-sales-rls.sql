-- =========================================================================
-- LAVLY SaaS - FIX ERRO RLS TABELA SALES & ORDERS (V6 - Correção UNNEST)
-- COPIE E RODE ESTE CÓDIGO NO "SQL EDITOR" DO SUPABASE
-- =========================================================================

-- 1. Remove políticas restritivas problemáticas na tabela SALES
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.sales;
DROP POLICY IF EXISTS "Service role can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Allow authenticated users to insert sales" ON public.sales;
DROP POLICY IF EXISTS "Users can view sales of assigned stores" ON public.sales;
DROP POLICY IF EXISTS "Allow ALL inserts on sales" ON public.sales;
DROP POLICY IF EXISTS "Users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Allow ALL updates on sales" ON public.sales;

-- 2. Cria política absoluta para INSERÇÃO no SALES (Liberado para Inserção Autenticada/Service)
CREATE POLICY "Allow ALL inserts on sales"
  ON public.sales
  FOR INSERT
  WITH CHECK (true);

-- 3. Cria política para LEITURA e UPDATE no SALES
-- CORREÇÃO DEFINITIVA: Utilizando UNNEST para converter o array text[] do Postgres em linhas de texto puro (compatível).
CREATE POLICY "Users can view sales"
  ON public.sales
  FOR SELECT
  USING (
    get_user_role_safe() = 'admin' OR 
    loja IN (SELECT unnest(assigned_stores) FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Allow ALL updates on sales"
  ON public.sales
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 4. Remove políticas restritivas problemáticas na tabela ORDERS
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.orders;
DROP POLICY IF EXISTS "Service role can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated users to insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Allow ALL inserts on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow ALL updates on orders" ON public.orders;

-- 5. Cria política absoluta para INSERÇÃO no ORDERS
CREATE POLICY "Allow ALL inserts on orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (true);

-- 6. Cria política para LEITURA e UPDATE no ORDERS
CREATE POLICY "Users can view orders"
  ON public.orders
  FOR SELECT
  USING (
    get_user_role_safe() = 'admin' OR 
    loja IN (SELECT unnest(assigned_stores) FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Allow ALL updates on orders"
  ON public.orders
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Garante RLS ativado (Boa Prática)
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

SELECT 'OK! Políticas bloqueadoras de RLS para Vendas e Pedidos removidas e liberadas para inserção.' as Resultado;
