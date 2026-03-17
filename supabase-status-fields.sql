-- Execute este código no SQL Editor do Supabase (https://app.supabase.com)

-- 1. Adicionar status ao perfil do usuário para gerenciar bloqueios e soft deletes
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Opcional: index para agilizar filtros de status
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 2. Adicionar status às lojas físicas configuradas
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
