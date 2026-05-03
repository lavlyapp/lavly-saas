import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { differenceInDays } from 'date-fns';

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

        // --- 1. Fetch CRM Metrics via Hypersonic RPC ---
        // Using last 30 days for period stats (to match opportunities logic)
        const nowBrt = new Date(Date.now() - (3 * 3600 * 1000));
        const todayStr = nowBrt.toISOString().substring(0, 10);
        const thirtyDaysAgo = new Date(nowBrt.getTime() - (30 * 24 * 3600 * 1000));
        const queryStartIso = `${thirtyDaysAgo.toISOString().substring(0, 10)}T00:00:00.000Z`;
        const queryEndIso = `${todayStr}T23:59:59.999Z`;

        const { data: rpcData, error: rpcError } = await supabase.rpc('get_crm_backend_metrics', {
            p_store: store,
            p_start_date: queryStartIso,
            p_end_date: queryEndIso
        });

        if (rpcError || !rpcData) {
            throw new Error(rpcError?.message || "RPC error");
        }

        const { rehydrateCrmMetrics, rehydratePeriodStats } = await import('@/lib/processing/crm_edge_adapter');
        const globalMetrics = rehydrateCrmMetrics(rpcData.globalProfiles);
        const periodStats = rehydratePeriodStats(rpcData.periodProfiles, rpcData.globalProfiles);

        // 1. Recovery List
        const recoveryList = globalMetrics.profiles
            .filter(p => p.recency > 30 && p.totalSpent > 100)
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 20);

        const inactivePrecious = globalMetrics.profiles.filter(p => p.recency > 20 && p.totalSpent > 50);
        const estimatedMonthlyLoss = inactivePrecious.reduce((acc, p) => {
            const daysSinceFirst = Math.max(differenceInDays(new Date(), p.firstVisitDate), 1);
            return acc + (p.totalSpent / Math.max(daysSinceFirst / 30, 1));
        }, 0);

        // 2. Opportunities
        const opportunities = {
            onlyWash: periodStats.onlyWashList.slice(0, 10),
            onlyDry: periodStats.onlyDryList.slice(0, 10)
        };

        // --- 2. Fetch Machine BI via Parallel Pagination ---
        let countQuery = supabase.from('sales').select('id', { count: 'exact', head: true });
        if (store !== 'Todas') countQuery = countQuery.eq('loja', store);
        
        const { count } = await countQuery;
        const totalRows = Math.min(count || 0, 5000); // 5000 is enough for Machine BI
        
        const pageSize = 1000;
        const promises = [];
        for (let i = 0; i < Math.ceil(totalRows / pageSize); i++) {
            let pageQuery = supabase.from('sales')
                .select('items, valor')
                .order('data', { ascending: false })
                .range(i * pageSize, (i + 1) * pageSize - 1);
            
            if (store !== 'Todas') pageQuery = pageQuery.eq('loja', store);
            promises.push(pageQuery);
        }

        const results = await Promise.all(promises);
        const recentRecords = results.flatMap(res => res.data || []);

        const machineMap = new Map<string, any>();
        
        for (let i = 0; i < recentRecords.length; i++) {
            const r = recentRecords[i];
            let itemsArray = r.items;
            if (typeof itemsArray === 'string') {
                try { itemsArray = JSON.parse(itemsArray); } catch(e) { itemsArray = []; }
            }
            if (!itemsArray || itemsArray.length === 0) continue;

            for (let j = 0; j < itemsArray.length; j++) {
                const item = itemsArray[j];
                const mId = item.machine;
                if (!mId) continue;

                let curr = machineMap.get(mId);
                if (!curr) {
                    curr = { id: mId, type: '', totalMinutes: 0, totalRevenue: 0, cycles: 0 };
                    machineMap.set(mId, curr);
                }

                const svcString = (item.service || '').toLowerCase();
                const machString = (item.machine || '').toLowerCase();
                const isWash = svcString.includes('lav') || machString.includes('lav');
                
                curr.type = isWash ? 'Lavadora' : 'Secadora';
                curr.cycles++;
                curr.totalRevenue += (item.value || 0);
                curr.totalMinutes += isWash ? 33.5 : 49;
            }
        }

        const machineBI = Array.from(machineMap.values()).map(m => ({
            ...m,
            revenuePerHour: m.totalMinutes > 0 ? (m.totalRevenue / (m.totalMinutes / 60)) : 0,
            maintenanceScore: Math.min(100, (m.cycles / 500) * 100)
        })).sort((a, b) => b.revenuePerHour - a.revenuePerHour);

        return NextResponse.json({
             success: true, 
             payload: { 
                 recoveryList, 
                 estimatedMonthlyLoss, 
                 opportunities, 
                 machineBI,
                 inactive30: globalMetrics.customerStats.inactive30,
                 globalAverageTicket: globalMetrics.globalAverageTicket 
             }
        });

    } catch (e: any) {
        console.error("Reports API Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
