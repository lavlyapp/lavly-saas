import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { calculateCrmMetrics } from '@/lib/processing/crm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');
        
        if (!name) {
            return NextResponse.json({ success: false, error: 'Name parameter is required' }, { status: 400 });
        }

        // Bypass RLS for this internal metrics fetch since we're using ilike which causes timeouts with RLS
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('sales')
            .select('id, data, loja, cliente, telefone, valor, produto')
            .ilike('cliente', name)
            .order('data', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            return NextResponse.json({ success: true, payload: null });
        }

        const parsedRecords = data.map(r => ({
            ...r,
            data: new Date(r.data),
            items: [] // No items column in Supabase sales table
        }));

        const metrics = calculateCrmMetrics(parsedRecords);
        const profile = metrics.profiles[0];

        return NextResponse.json({
             success: true, 
             payload: profile
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
