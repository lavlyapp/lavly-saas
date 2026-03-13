-- =========================================================================
-- LAVLY SaaS - CONTROLE DE VALIDADE DE ASSINATURA (EXPIRES_AT)
-- COPIE E RODE ESTE CÓDIGO NO "SQL EDITOR" DO SUPABASE
-- =========================================================================

-- 1. Adicionando a coluna de validade da assinatura na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- 2. Dando 30 dias de graça para quem já está na plataforma hoje, como segurança inicial.
-- Você pode alterar depois diretamente pelo banco ou pelo Admin Dashboard.
UPDATE public.profiles 
SET expires_at = (timezone('utc'::text, now()) + interval '30 days')
WHERE expires_at IS NULL AND role != 'admin';

-- Administrador supremo (você) nunca expira
UPDATE public.profiles 
SET expires_at = '2099-12-31 23:59:59Z'
WHERE role = 'admin';

SELECT 'Migração de Assinaturas (expires_at) concluída com sucesso!' as status;
