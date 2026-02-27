-- MIGRAÇÃO DE NOMES DE LOJAS PARA LAVLY SAAS
-- Este script normaliza os nomes das lojas nas tabelas de vendas e pedidos

-- 1. Atualizar a tabela de vendas (Sales)
UPDATE sales 
SET loja = 'Lavateria Cascavel' 
WHERE loja IN ('Lavateria BEZERRA MENEZES', 'BEZERRA MENEZES', 'Lavateria Bezerra Menezes');

-- 2. Atualizar a tabela de pedidos (Orders)
UPDATE orders 
SET loja = 'Lavateria Cascavel' 
WHERE loja IN ('Lavateria BEZERRA MENEZES', 'BEZERRA MENEZES', 'Lavateria Bezerra Menezes');

-- 3. Garantir que a tabela de lojas esteja correta
UPDATE stores 
SET name = 'Lavateria Cascavel' 
WHERE cnpj = '43660010000166';

-- Repetir para outras lojas se houver variações (opcional, mas Bezerra é a principal discrepância)
-- Adiciona logs
INSERT INTO activity_logs (action, details) 
VALUES ('SQL_MIGRATION', ('{"description": "Normalização de nomes de lojas para Lavateria Cascavel", "timestamp": "' || NOW() || '"}')::jsonb);
