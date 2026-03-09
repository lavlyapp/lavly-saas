-- =========================================================================
-- LAVLY SaaS - MULTI-TENANT ARCHITECTURE MIGRATION (FIX 1)
-- COPIE E RODE ESTE CÓDIGO NOVAMENTE NO "SQL EDITOR" DO SUPABASE
-- =========================================================================

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role text not null default 'owner' check (role in ('admin', 'owner', 'attendant')),
  assigned_stores text[] default '{}',
  subscription_status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Clean existing conflicting policies (Fixing the infinite recursion)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Sales multi-tenant isolation" ON public.sales;
DROP POLICY IF EXISTS "Orders multi-tenant isolation" ON public.orders;
DROP POLICY IF EXISTS "Customers multi-tenant isolation" ON public.customers;

-- 3. Profile Policies (Fixed to avoid infinite recursion)
-- A user can always view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Para evitar recursão infinita (a policy de profiles consultar a tabela profiles),
-- o Supabase sugere checar o token JWT ou criar uma function SECURITY DEFINER.
-- A forma mais simples e robusta de contornar a recursão em projetos Supabase é:
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_adm BOOLEAN;
BEGIN
  SELECT role = 'admin' INTO is_adm FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(is_adm, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agora a política usa uma sub-rotina com privilégios de sistema, sem acionar as RLS ciclicamente
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 4. Multi-Tenant Application Policies (Fixed using the new is_admin function)

-- Ativar RLS nas tabelas principais
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- SALES
CREATE POLICY "Sales multi-tenant isolation" ON public.sales
  FOR SELECT USING (
    public.is_admin()
    OR
    loja = ANY (
      ARRAY(SELECT unnest(assigned_stores) FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ORDERS
CREATE POLICY "Orders multi-tenant isolation" ON public.orders
  FOR SELECT USING (
    public.is_admin()
    OR
    loja = ANY (
      ARRAY(SELECT unnest(assigned_stores) FROM public.profiles WHERE id = auth.uid())
    )
  );

-- CUSTOMERS
CREATE POLICY "Customers multi-tenant isolation" ON public.customers
  FOR SELECT USING (
    true -- Se precisar isolar clientes por loja, precisamos conferir se a tabela *customers* tem a coluna *loja*. 
  );
