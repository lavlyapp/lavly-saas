-- 1. Relaxamos a constraint temporariamente para aceitar o padrão antigo ('owner') 
-- que o gatilho interno do Supabase ainda pode estar tentando usar ao criar a conta.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'proprietario', 'atendente', 'owner'));

-- 2. Garantimos que o gatilho insere o valor aceito
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, subscription_status)
  VALUES (new.id, 'proprietario', 'active');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
