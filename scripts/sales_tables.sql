-- TABELAS DE PERSISTÊNCIA DE VENDAS E PEDIDOS
-- Execute este script no SQL Editor do Supabase

-- 1. Tabela de Vendas (Histórico Consolidado)
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY, -- ID Composto (Loja-IDVenda ou Hash)
    data TIMESTAMPTZ NOT NULL,
    loja TEXT NOT NULL,
    cliente TEXT,
    customer_id TEXT, -- ID do Cliente no VMPay
    produto TEXT,
    valor DECIMAL(10,2) NOT NULL,
    forma_pagamento TEXT,
    tipo_cartao TEXT,
    categoria_voucher TEXT,
    desconto DECIMAL(10,2) DEFAULT 0,
    telefone TEXT,
    birth_date DATE,
    age INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Itens de Pedido (Detalhamento por Máquina)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id TEXT REFERENCES sales(id) ON DELETE CASCADE,
    data TIMESTAMPTZ NOT NULL,
    loja TEXT NOT NULL,
    cliente TEXT,
    machine TEXT,
    service TEXT,
    status TEXT,
    valor DECIMAL(10,2),
    customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para Performance
CREATE INDEX IF NOT EXISTS idx_sales_data ON sales(data);
CREATE INDEX IF NOT EXISTS idx_sales_loja ON sales(loja);
CREATE INDEX IF NOT EXISTS idx_orders_sale_id ON orders(sale_id);
CREATE INDEX IF NOT EXISTS idx_orders_data ON orders(data);

-- 4. Segurança (RLS)
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON sales FOR ALL USING (auth.role() = 'authenticated');
        CREATE POLICY "Enable all access for authenticated users" ON orders FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
