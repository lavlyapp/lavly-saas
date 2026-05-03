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
        const period = searchParams.get('period') || 'last30days';
        const startCustom = searchParams.get('start');
        const endCustom = searchParams.get('end');

        const cookieStore = await cookies();
        const authHeader = request.headers.get('Authorization');

        let supabase;
        if (authHeader) {
            const { createClient } = await import('@supabase/supabase-js');
            supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: authHeader } } });
        } else {
            supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } });
        }

        // --- 1. Compute Date Boundaries in BRT (UTC-3) ---
        const now = new Date();
        const nowBrt = new Date(now.getTime() - (3 * 3600 * 1000));
        const yestBrt = new Date(nowBrt.getTime() - (24 * 3600 * 1000));
        
        const todayStr = nowBrt.toISOString().substring(0, 10);
        const yesterdayStr = yestBrt.toISOString().substring(0, 10);
        const targetMonthStr = todayStr.substring(0, 7);
        
        let lastMonthStr = new Date(nowBrt.getFullYear(), nowBrt.getMonth() - 1, 1).toISOString().substring(0, 7);
        if (period === 'lastMonth') {
            const m = nowBrt.getMonth();
            const y = m === 0 ? nowBrt.getFullYear() - 1 : nowBrt.getFullYear();
            const paddedM = m === 0 ? '12' : String(m).padStart(2, '0');
            lastMonthStr = `${y}-${paddedM}`;
        }

        let queryStartIso: string | null = null;
        let queryEndIso: string | null = null;

        function getBrtIsoStart(dateStr: string) {
            return new Date(`${dateStr}T00:00:00-03:00`).toISOString();
        }
        function getBrtIsoEnd(dateStr: string) {
            return new Date(`${dateStr}T23:59:59.999-03:00`).toISOString();
        }
        
        // Helper to get days in month
        const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

        if (period === 'today') {
            queryStartIso = getBrtIsoStart(todayStr);
            queryEndIso = getBrtIsoEnd(todayStr);
        } else if (period === 'yesterday') {
            queryStartIso = getBrtIsoStart(yesterdayStr);
            queryEndIso = getBrtIsoEnd(yesterdayStr);
        } else if (period === 'thisMonth') {
            queryStartIso = getBrtIsoStart(`${targetMonthStr}-01`);
            queryEndIso = getBrtIsoEnd(`${targetMonthStr}-${String(getDaysInMonth(nowBrt)).padStart(2, '0')}`);
        } else if (period === 'lastMonth') {
            queryStartIso = getBrtIsoStart(`${lastMonthStr}-01`);
            queryEndIso = getBrtIsoEnd(`${lastMonthStr}-${String(getDaysInMonth(new Date(nowBrt.getFullYear(), nowBrt.getMonth() - 1, 1))).padStart(2, '0')}`);
        } else if (period === 'custom' && startCustom && endCustom) {
            queryStartIso = getBrtIsoStart(startCustom);
            queryEndIso = getBrtIsoEnd(endCustom);
        } else {
            // Default: last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            queryStartIso = thirtyDaysAgo.toISOString();
        }

        // PostgREST limits queries to 1000 rows by default. For Queue Analysis we need at least 15,000 rows
        // to have a representative sample over 30 days for the entire network.
        // We use parallel pagination to fetch this efficiently within Vercel's timeout.
        let countQuery = supabase.from('sales').select('id', { count: 'exact', head: true });
        if (queryStartIso) countQuery = countQuery.gte('data', queryStartIso);
        if (queryEndIso) countQuery = countQuery.lte('data', queryEndIso);
        if (store !== 'Todas') countQuery = countQuery.eq('loja', store);
        
        const { count } = await countQuery;
        // Limit to 20,000 for "Todas", or 5,000 for a single store to protect memory
        const totalRows = Math.min(count || 0, store === 'Todas' ? 20000 : 5000);
        
        const pageSize = 1000;
        const promises = [];
        for (let i = 0; i < Math.ceil(totalRows / pageSize); i++) {
            let pageQuery = supabase.from('sales')
                .select('id, data, loja, cliente, telefone, valor, produto, orders(machine, service)')
                .order('data', { ascending: false })
                .range(i * pageSize, (i + 1) * pageSize - 1);
            
            if (queryStartIso) pageQuery = pageQuery.gte('data', queryStartIso);
            if (queryEndIso) pageQuery = pageQuery.lte('data', queryEndIso);
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
