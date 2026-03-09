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

        // Create admin client to bypass RLS and perform read
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const adminDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey!);

        // Fetch up to 2000 most recent sales explicitly
        const { data, error } = await adminDb
            .from('sales')
            .select('id, data, loja, cliente, customer_id, produto, valor, forma_pagamento, tipo_cartao, categoria_voucher, desconto, telefone, birth_date, age')
            .gte('data', after)
            .order('data', { ascending: false })
            .limit(2000);

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
