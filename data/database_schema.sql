-- Table to store VMPay credentials for each store
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Operating Hours (Local Time)
    open_time TIME DEFAULT '07:00:00',
    close_time TIME DEFAULT '23:00:00',
    
    -- AC Subscription & Automation Settings
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

-- Enable RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Simple policy for read-only access (adjust as needed for super admins)
CREATE POLICY "Enable read access for all users" ON stores FOR SELECT USING (true);

-- Insert existing stores from vmpay-config.ts as reference (User should run this in Supabase)
-- INSERT INTO stores (name, cnpj, api_key) VALUES 
-- ('Lavateria BEZERRA MENEZES', '43660010000166', 'e8689749-58b1-4a3e-8f1c-11d1a5e2b42e'),
-- ('Lavateria SANTOS DUMONT', '53261645000144', '2bfcb6f6-144b-46c1-8fc3-cef8fbf41729'),
-- ('Lavateria JOSE WALTER', '53261614000193', 'a2862031-5a98-4eb2-8b0a-e7b8cc195263'),
-- ('Lavateria SHOPPING (Maracanau)', '51638594000100', 'f08c45c8-126a-4cb4-ab5d-5c8805c8130f'),
-- ('Lavateria SHOPPING SOLARES', '54539282000129', '68360f6d-fbec-4991-bd2e-c6ff89201e40'),
-- ('Lavateria JOQUEI', '50741565000106', 'cc9c772c-ad36-43a6-a3af-582da70feb07');
