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

        // PostgREST limits queries to 1000 rows by default. For Queue Analysis we need at least 15,000 rows
        // to have a representative sample over 30 days for the entire network.
        // We use parallel pagination to fetch this efficiently within Vercel's timeout.
        let countQuery = supabase.from('sales').select('id', { count: 'exact', head: true }).gte('data', thirtyDaysAgo.toISOString());
        if (store !== 'Todas') countQuery = countQuery.eq('loja', store);
        
        const { count } = await countQuery;
        // Limit to 20,000 for "Todas", or 5,000 for a single store to protect memory
        const totalRows = Math.min(count || 0, store === 'Todas' ? 20000 : 5000);
        
        const pageSize = 1000;
        const promises = [];
        for (let i = 0; i < Math.ceil(totalRows / pageSize); i++) {
            let pageQuery = supabase.from('sales')
                .select('id, data, loja, cliente, telefone, valor, produto, orders(machine, service)')
                .gte('data', thirtyDaysAgo.toISOString())
                .order('data', { ascending: false })
                .range(i * pageSize, (i + 1) * pageSize - 1);
            
            if (store !== 'Todas') pageQuery = pageQuery.eq('loja', store);
            promises.push(pageQuery);
        }
        
        const results = await Promise.all(promises);
        const records: any[] = results.flatMap(r => r.data || []);

        // Rehydrate Dates
        const parsedRecords = records.map(r => ({
            ...r,
            data: new Date(r.data),
            items: r.orders || []
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
