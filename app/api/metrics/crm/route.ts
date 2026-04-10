import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { calculateCrmMetrics, calculatePeriodStats, calculateVisitsHeatmap } from '@/lib/processing/crm';
import { SaleRecord } from '@/lib/processing/etl';

export const runtime = 'nodejs'; // Use Node instead of edge for V8 memory limits handling 42k arrays
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'thisMonth';
        const store = searchParams.get('store') || 'Todas';
        const startCustom = searchParams.get('start');
        const endCustom = searchParams.get('end');

        // Auth
        const cookieStore = await cookies();
        const authHeader = request.headers.get('Authorization');

        let supabase;
        if (authHeader) {
            const { createClient } = await import('@supabase/supabase-js');
            supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { global: { headers: { Authorization: authHeader } } }
            );
        } else {
            supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
            );
        }

        console.time('[API CRM] Total Execution');
        console.time('[API CRM] Fetching Data');

        // Parallel Fetch Strategy
        const PAGE_SIZE = 1000;
        
        // 1. Get total count
        const countQuery = supabase.from('sales').select('*', { count: 'exact', head: true });
        if (store !== 'Todas') countQuery.eq('loja', store);
        const { count } = await countQuery;
        
        if (!count || count === 0) {
            return NextResponse.json({ success: true, payload: null });
        }

        // 2. Fetch all sales natively on backend in chunks
        const pages = Math.ceil(count / PAGE_SIZE);
        const chunkPromises = [];
        
        for (let i = 0; i < pages; i++) {
            let q = supabase.from('sales').select('id, data, valor, loja, produto, cliente, telefone').range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1);
            if (store !== 'Todas') q.eq('loja', store);
            chunkPromises.push(q);
        }

        // Fetch Orders mapping
        const ordersCountQuery = supabase.from('orders').select('*', { count: 'exact', head: true });
        if (store !== 'Todas') ordersCountQuery.eq('loja', store);
        const ordersCountRes = await ordersCountQuery;
        
        const ordersPages = Math.ceil((ordersCountRes.count || 0) / PAGE_SIZE);
        for (let i = 0; i < ordersPages; i++) {
           let qO = supabase.from('orders').select('id, store, sale_id, machine, service').range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1);
           if (store !== 'Todas') qO.eq('loja', store);
           chunkPromises.push(qO);
        }
        
        chunkPromises.push(supabase.from('customers').select('*').limit(5000));

        const results = await Promise.all(chunkPromises);
        console.timeEnd('[API CRM] Fetching Data');
        
        let allRecords: SaleRecord[] = [];
        let allOrders: any[] = [];
        let allCustomers: any[] = [];

        results.forEach((res, index) => {
            if (res.data) {
                if (index < pages) {
                    allRecords = allRecords.concat(res.data.map((r: any) => ({
                        ...r, 
                        data: new Date(r.data)
                    })));
                } else if (index < pages + ordersPages) {
                    allOrders = allOrders.concat(res.data);
                } else {
                    allCustomers = res.data;
                }
            }
        });

        console.time('[API CRM] Processing JavaScript Lógica Pesada');

        const nowBrt = new Date(Date.now() - (3 * 3600 * 1000));
        const todayStr = nowBrt.toISOString().substring(0, 10);
        const yestBrt = new Date(nowBrt.getTime() - (24 * 3600 * 1000));
        const yesterdayStr = yestBrt.toISOString().substring(0, 10);
        const targetMonthStr = todayStr.substring(0, 7);
        
        let lastMonthStr = new Date(nowBrt.getFullYear(), nowBrt.getMonth() - 1, 1).toISOString().substring(0, 7);
        if (period === 'lastMonth') {
            const m = nowBrt.getMonth();
            const y = m === 0 ? nowBrt.getFullYear() - 1 : nowBrt.getFullYear();
            const paddedM = m === 0 ? '12' : String(m).padStart(2, '0');
            lastMonthStr = `${y}-${paddedM}`;
        }

        const filteredRecords = allRecords.filter((r) => {
            if (!r.data) return false;
            const dbDateStr = r.data.toISOString().substring(0, 10);
            switch (period) {
                case 'today': return dbDateStr === todayStr;
                case 'yesterday': return dbDateStr === yesterdayStr;
                case 'thisMonth': return dbDateStr.startsWith(targetMonthStr);
                case 'lastMonth': return dbDateStr.startsWith(lastMonthStr);
                case 'custom': return dbDateStr >= (startCustom || '') && dbDateStr <= (endCustom || '9999-99-99');
                default: return dbDateStr.startsWith(targetMonthStr);
            }
        });

        const globalMetrics = calculateCrmMetrics(allRecords, allCustomers, allOrders);
        const filteredMetrics = calculateCrmMetrics(filteredRecords, allCustomers, allOrders);
        const periodStats = calculatePeriodStats(filteredRecords, allRecords, allOrders);
        const visitsHeatmapData = calculateVisitsHeatmap(filteredRecords);

        // Strip heavy arrays to optimize JSON transfer
        const lightGlobal = { ...globalMetrics, profiles: globalMetrics.profiles }; // Kept for Top15 and Searching
        const lightFiltered = { ...filteredMetrics, profiles: [] };

        console.timeEnd('[API CRM] Processing JavaScript Lógica Pesada');
        console.timeEnd('[API CRM] Total Execution');

        return NextResponse.json({
            success: true,
            payload: {
                globalMetrics: lightGlobal,
                filteredMetrics: lightFiltered,
                periodStats,
                visitsHeatmapData
            }
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
