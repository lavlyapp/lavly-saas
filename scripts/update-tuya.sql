-- Rode este script no Supabase Studio (SQL Editor) para atualizar a senha da Tuya
-- Nova Senha Fornecida: z/4x=SgJnu%7

UPDATE stores 
SET tuya_client_secret = 'z/4x=SgJnu%7'
WHERE tuya_client_id IS NOT NULL;

-- Verifica as lojas atualizadas:
SELECT name, tuya_client_id, tuya_client_secret 
FROM stores 
WHERE tuya_client_secret = 'z/4x=SgJnu%7';
