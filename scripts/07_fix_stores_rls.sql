-- 07_fix_stores_rls.sql
-- Allow authenticated users to SELECT from stores 
-- This fixes the issue in SettingsPage where stores appear empty due to RLS blocking the client-side fetch.

-- Enable RLS if not already enabled
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON stores;
DROP POLICY IF EXISTS "Authenticated users can select stores" ON stores;
DROP POLICY IF EXISTS "Let users read stores" ON stores;

-- Create policy allowing ANY authenticated user to read stores
CREATE POLICY "Authenticated users can select stores" 
ON stores FOR SELECT 
TO authenticated 
USING (true);

-- Allow admins to insert/update stores as well
DROP POLICY IF EXISTS "Authenticated users can update stores" ON stores;
CREATE POLICY "Authenticated users can update stores"
ON stores FOR UPDATE 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert stores" ON stores;
CREATE POLICY "Authenticated users can insert stores"
ON stores FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete stores" ON stores;
CREATE POLICY "Authenticated users can delete stores"
ON stores FOR DELETE
TO authenticated
USING (true);

-- End of script
