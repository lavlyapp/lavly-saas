import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCanonicalStoreName } from '@/lib/vmpay-config';

export const maxDuration = 60; // 1 minute max duration

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const after = searchParams.get('after');

        if (!after) {
            return NextResponse.json({ success: false, error: 'Missing "after" parameter.' }, { status: 400 });
        }

        // Authenticate the caller to enforce data isolation
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, error: 'Unauthorized. Missing token.' }, { status: 401 });
        }
        const token = authHeader.replace('Bearer ', '');

        // Create admin client to bypass RLS and perform read securely
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const adminDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey!);

        const { data: { user }, error: authError } = await adminDb.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized. Invalid token.' }, { status: 401 });
        }

        // Fetch user profile to get assigned stores
        const { data: profile } = await adminDb.from('profiles').select('role, assigned_stores').eq('id', user.id).single();

        let query = adminDb
            .from('sales')
            .select('id, data, loja, cliente, customer_id, produto, valor, forma_pagamento, tipo_cartao, categoria_voucher, desconto, telefone, birth_date, age')
            .gte('data', after)
            .order('data', { ascending: false })
            .limit(2000);

        // Apply Data Isolation Filter if not Admin
        if (profile?.role !== 'admin' && profile?.assigned_stores && profile.assigned_stores.length > 0) {
            // Because store names in DB might slightly differ, we should use the exact strings from assigned_stores
            // or we rely on the backend normalizer. Assuming DB 'loja' perfectly matches assigned_stores items.
            query = query.in('loja', profile.assigned_stores);
        } else if (profile?.role !== 'admin') {
            // User has no assigned stores and is not admin. Return empty.
            return NextResponse.json({ success: true, records: [] });
        }

        // Fetch up to 2000 most recent sales explicitly
        const { data, error } = await query;

        if (error) {
            throw error;
        }

        // Return records so DashboardClient can append them directly to state and IDB
        return NextResponse.json({
            success: true,
            records: data || []
        });
    } catch (error: any) {
        console.error("[API] Sync Fallback Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
