-- CORREÇÃO DEFINITIVA DE SEGURANÇA (RLS) PARA VENDAS E PEDIDOS
-- Copie este código e cole no SQL Editor do seu Supabase, depois clique em "Run".

-- 1. Garante que o RLS está ativado nas tabelas
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 2. Remove as políticas antigas que podem estar travando os robôs
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON sales;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON orders;
DROP POLICY IF EXISTS "Insert sales" ON sales;
DROP POLICY IF EXISTS "Insert orders" ON orders;

-- 3. Cria novas políticas permitindo que usuários Autenticados (O sistema Lavly) possam Inserir, Atualizar e Ler os dados livremente.
CREATE POLICY "SuperAdmin Full Access Sales" ON sales
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "SuperAdmin Full Access Orders" ON orders
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 4. Opcional: Garante que o usuário anônimo não tem acesso (mantendo a segurança)
-- Nenhuma política para 'anon' foi criada.

SELECT 'As permissões de vendas e pedidos foram corrigidas com sucesso!' as status;
