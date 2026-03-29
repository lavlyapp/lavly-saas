-- Migration para adicionar lógica de expiração de acesso e acesso vitalício

-- Adicionar colunas na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_lifetime_access BOOLEAN DEFAULT FALSE;

-- Definir acesso vitalício para o administrador (supondo que ele tenha a role 'admin')
-- Opcionalmente, atualizará todos os admins para terem acesso vitalício.
UPDATE public.profiles
SET is_lifetime_access = TRUE
WHERE role = 'admin';

-- Para os demais usuários (opcional), definir uma data de expiração inicial
-- Aqui, nós não preenchemos nada para não bloquear os atuais imediatamente.
-- UPDATE public.profiles
-- SET access_expires_at = NOW() + INTERVAL '30 days'
-- WHERE role != 'admin' AND is_lifetime_access = FALSE;
