-- 1. Permitir que usuários autenticados gerenciem as lojas (Fix RLS)
DROP POLICY IF EXISTS "Superadmins can manage stores" ON stores;
CREATE POLICY "Authenticated users can manage stores" ON stores 
FOR ALL USING (auth.role() = 'authenticated');

-- 2. Inserir as 6 lojas
INSERT INTO stores (name, cnpj, api_key, is_active) VALUES 
('Lavateria BEZERRA MENEZES', '43660010000166', 'e8689749-58b1-4a3e-8f1c-11d1a5e2b42e', true),
('Lavateria SANTOS DUMONT', '53261645000144', '2bfcb6f6-144b-46c1-8fc3-cef8fbf41729', true),
('Lavateria JOSE WALTER', '53261614000193', 'a2862031-5a98-4eb2-8b0a-e7b8cc195263', true),
('Lavateria SHOPPING (Maracanau)', '51638594000100', 'f08c45c8-126a-4cb4-ab5d-5c8805c8130f', true),
('Lavateria SHOPPING SOLARES', '54539282000129', '68360f6d-fbec-4991-bd2e-c6ff89201e40', true),
('Lavateria JOQUEI', '50741565000106', 'cc9c772c-ad36-43a6-a3af-582da70feb07', true)
ON CONFLICT (cnpj) DO UPDATE SET 
    name = EXCLUDED.name,
    api_key = EXCLUDED.api_key,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
