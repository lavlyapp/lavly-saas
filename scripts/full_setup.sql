-- SCRIPT COMPLETO DE CONFIGURAÇÃO - LAVLY SAAS
-- Execute este script no SQL Editor do Supabase

-- 1. Tabela de Logs de Atividade
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    store_cnpj TEXT,
    ip_address TEXT
);

-- 2. Tabela de Perfis de Usuário (RBAC)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'OWNER', -- SUPERADMIN, OWNER, ATTENDANT
    assigned_stores TEXT[] DEFAULT '{}', -- Array de CNPJs
    vmpay_user TEXT,
    vmpay_password TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Lojas
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Horários de Operação
    open_time TIME DEFAULT '07:00:00',
    close_time TIME DEFAULT '23:00:00',
    
    -- Automação Tuya/Ar-Condicionado
    has_ac_subscription BOOLEAN DEFAULT false,
    tuya_device_id TEXT,
    tuya_client_id TEXT,
    tuya_client_secret TEXT,
    tuya_scene_on_id TEXT,
    tuya_scene_off_id TEXT,

    ac_turn_off_at TIMESTAMP WITH TIME ZONE,
    last_sync_sales TIMESTAMP WITH TIME ZONE,
    last_sync_customers TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Segurança (RLS - Row Level Security)
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DO $$ BEGIN
    -- Activity Logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own activity') THEN
        CREATE POLICY "Users can view their own activity" ON activity_logs FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    -- Profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own profile') THEN
        CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
    END IF;

    -- Stores
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON stores FOR SELECT USING (true);
    END IF;

    -- Superadmin Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Superadmins can view all activities') THEN
        CREATE POLICY "Superadmins can view all activities" ON activity_logs FOR SELECT USING (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPERADMIN')
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Superadmins can manage stores') THEN
        CREATE POLICY "Superadmins can manage stores" ON stores FOR ALL USING (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPERADMIN')
        );
    END IF;
END $$;
