import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { calculateMachineAvailability, findFlexibleCustomers } from '@/lib/processing/machine-availability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const store = searchParams.get('store') || 'Todas';

        const cookieStore = await cookies();
        const authHeader = request.headers.get('Authorization');

        let supabase;
        if (authHeader) {
            const { createClient } = await import('@supabase/supabase-js');
            supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: authHeader } } });
        } else {
            supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } });
        }

        // Performance optimization: we only need the last 30 days to calculate queue probability
        // Offload filtering to PostgreSQL to avoid OOM / 504 Gateway Timeout in Vercel Edge
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let dataQuery = supabase.from('sales')
            .select('id, data, loja, cliente, telefone, items, valor, produto')
            .gte('data', thirtyDaysAgo.toISOString())
            .order('data', { ascending: false })
            .limit(6000);
            
        if (store !== 'Todas') dataQuery = dataQuery.eq('loja', store);
        
        const { data, error } = await dataQuery;
        if (error) {
            console.error("Queue query error:", error);
        }
        
        const records: any[] = data || [];

        // Rehydrate Dates
        const parsedRecords = records.map(r => ({
            ...r,
            data: new Date(r.data),
            items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || [])
        }));

        // Processing
        const metrics = calculateMachineAvailability(parsedRecords);
        const flexibleCustomers = findFlexibleCustomers(parsedRecords, metrics.saturationByHour);

        // Heatmap Processing
        const visitsHeatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
        const processedVisits = new Set<string>();

        parsedRecords.forEach(r => {
            if (!r.data) return;
            try {
                const brtDate = new Date(r.data.getTime() - (3 * 3600 * 1000));
                const dayOfWeek = brtDate.getUTCDay();
                const h = brtDate.getUTCHours();
                const dateKey = `${brtDate.getUTCFullYear()}-${brtDate.getUTCMonth()}-${brtDate.getUTCDate()}`;
                const key = `${dateKey}-${h}-${r.cliente || 'anon'}`;

                if (!processedVisits.has(key)) {
                    visitsHeatmap[dayOfWeek][h]++;
                    processedVisits.add(key);
                }
            } catch (e) { }
        });

        return NextResponse.json({
             success: true, 
             payload: { metrics, flexibleCustomers, visitsHeatmap, debugRecords: parsedRecords.slice(0, 3) }
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
