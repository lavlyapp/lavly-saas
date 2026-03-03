-- 06_add_address_to_stores.sql
-- Adiciona colunas de endereço para cada loja

ALTER TABLE stores ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS state TEXT;

-- Comentários para documentação
COMMENT ON COLUMN stores.cep IS 'Código de Endereçamento Postal (CEP)';
COMMENT ON COLUMN stores.address IS 'Logradouro da loja';
COMMENT ON COLUMN stores.neighborhood IS 'Bairro da loja';
COMMENT ON COLUMN stores.city IS 'Cidade da loja';
COMMENT ON COLUMN stores.state IS 'Estado da loja (UF)';
