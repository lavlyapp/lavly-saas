-- Migration to add VMPay Master Credentials to Profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS vmpay_user TEXT,
ADD COLUMN IF NOT EXISTS vmpay_password TEXT;

-- Migration to ensure Stores table has all needed fields for management
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update RLS for Superadmins to manage stores
CREATE POLICY "Superadmins can manage stores" ON stores
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPERADMIN')
    );
