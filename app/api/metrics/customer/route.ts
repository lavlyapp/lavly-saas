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

        const cookieStore = await cookies();
        const authHeader = request.headers.get('Authorization');

        let supabase;
        if (authHeader) {
            const { createClient } = await import('@supabase/supabase-js');
            supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: authHeader } } });
        } else {
            supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } });
        }

        const { data, error } = await supabase
            .from('sales')
            .select('id, data, loja, cliente, telefone, items, valor, produto, maquina, servico')
            .eq('cliente', name)
            .order('data', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            return NextResponse.json({ success: true, payload: null });
        }

        const parsedRecords = data.map(r => ({
            ...r,
            data: new Date(r.data),
            items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || [])
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
