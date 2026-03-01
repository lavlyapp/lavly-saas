-- Criação da tabela de Clientes para persistir Gênero e Dados Demográficos
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf TEXT UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    gender VARCHAR(1) DEFAULT 'U', -- 'M' (Masculino), 'F' (Feminino), 'U' (Não Informado)
    registration_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissões de Segurança (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users on customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users on customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users on customers" ON customers FOR UPDATE USING (true);

-- (Opcional) Adicionando coluna gender na tabela de vendas para consultas rápidas no futuro
ALTER TABLE sales ADD COLUMN IF NOT EXISTS gender VARCHAR(1) DEFAULT 'U';
