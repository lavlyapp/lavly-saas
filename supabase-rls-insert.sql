-- =========================================================================
-- LAVLY SaaS - MULTI-TENANT ARCHITECTURE (FIX 5 - PERMISSÃO DE GRAVAÇÃO)
-- COPIE E RODE ESTE CÓDIGO NO "SQL EDITOR" DO SUPABASE
-- =========================================================================

-- O sistema (RLS) estava bloqueando silenciosamente a gravação do Painel
-- porque a política de segurança original (migration 1) só concedeu permissão
-- de LEITURA (SELECT). Então a API encontrava as vendas, mas falhava ao salvar.
-- Vamos conceder permissão de GRAVAÇÃO (INSERT/UPDATE) apenas para suas lojas:

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Owner pode inserir suas vendas" ON public.sales;
DROP POLICY IF EXISTS "Owner pode atualizar suas vendas" ON public.sales;
DROP POLICY IF EXISTS "Owner pode inserir seus pedidos" ON public.orders;
DROP POLICY IF EXISTS "Owner pode atualizar seus pedidos" ON public.orders;
DROP POLICY IF EXISTS "Admins podem inserir lojas" ON public.stores;
DROP POLICY IF EXISTS "Admins podem inserir clientes" ON public.customers;

-- ==================
-- TABELA SALES
-- ==================
CREATE POLICY "Owner pode inserir suas vendas" ON public.sales
  FOR INSERT WITH CHECK (
    public.is_admin() OR loja = ANY (ARRAY(SELECT unnest(assigned_stores) FROM public.profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Owner pode atualizar suas vendas" ON public.sales
  FOR UPDATE USING (
    public.is_admin() OR loja = ANY (ARRAY(SELECT unnest(assigned_stores) FROM public.profiles WHERE id = auth.uid()))
  );

-- ==================
-- TABELA ORDERS
-- ==================
CREATE POLICY "Owner pode inserir seus pedidos" ON public.orders
  FOR INSERT WITH CHECK (
    public.is_admin() OR loja = ANY (ARRAY(SELECT unnest(assigned_stores) FROM public.profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Owner pode atualizar seus pedidos" ON public.orders
  FOR UPDATE USING (
    public.is_admin() OR loja = ANY (ARRAY(SELECT unnest(assigned_stores) FROM public.profiles WHERE id = auth.uid()))
  );

-- ==================
-- TABELAS GENÉRICAS (STORES E CUSTOMERS)
-- ==================
-- O Painel VMPay salva lojas e clientes de forma global, portanto, 
-- damos permissão para contas autenticadas inserirem (RLS genérica):
CREATE POLICY "Admins podem inserir lojas" ON public.stores
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admins podem inserir clientes" ON public.customers
  FOR ALL USING (auth.role() = 'authenticated');
