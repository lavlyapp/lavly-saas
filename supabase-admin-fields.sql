-- Execute este código no "SQL Editor" do seu painel Supabase (https://app.supabase.com)

-- 1. Cria a coluna de apelido visível apenas no painel admin
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS admin_alias TEXT;

-- 2. Cria a coluna para vincular usuários (filhos) a um pagante (pai)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.profiles(id);

-- 3. (Opcional) Cria um índice para melhorar a velocidade das consultas na API Mestra
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON public.profiles(parent_id);
