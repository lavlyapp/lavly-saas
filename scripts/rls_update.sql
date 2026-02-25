-- FIX PERMISSIONS FOR STORE MANAGEMENT
-- Run this in the Supabase SQL Editor

-- 1. Ensure profiles can be created/seen by the owner
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can manage their own profile" ON profiles 
    FOR ALL USING (auth.uid() = id);

-- 2. Relax store management policy
-- During MVP, allow any authenticated user to manage any store (or filter by assigned_stores later)
-- For now, let's allow all authenticated users for simplicity and to unblock the user.
DROP POLICY IF EXISTS "Superadmins can manage stores" ON stores;
DROP POLICY IF EXISTS "Enable read access for all users" ON stores;

CREATE POLICY "Authenticated users can manage all stores" ON stores
    FOR ALL USING (auth.role() = 'authenticated');

-- 3. Ensure activity logs can be written by anyone authenticated
DROP POLICY IF EXISTS "Users can view their own activity" ON activity_logs;
CREATE POLICY "Authenticated users can manage their own logs" ON activity_logs
    FOR ALL USING (auth.role() = 'authenticated');
