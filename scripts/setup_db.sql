-- SQL Script to setup Lavly SaaS Database Schema
-- Run this in the Supabase SQL Editor

-- 1. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    store_cnpj TEXT,
    ip_address TEXT
);

-- 2. Profiles Table (RBAC)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'OWNER', -- SUPERADMIN, OWNER, ATTENDANT
    assigned_stores TEXT[] DEFAULT '{}', -- Array of CNPJs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Simple Policies (to be refined)
CREATE POLICY "Users can view their own activity" ON activity_logs 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all activities" ON activity_logs 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPERADMIN')
    );

CREATE POLICY "Users can view their own profile" ON profiles 
    FOR SELECT USING (auth.uid() = id);
