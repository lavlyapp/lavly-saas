import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { calculateCrmMetrics, calculatePeriodStats } from '@/lib/processing/crm';
import { differenceInDays, subDays } from 'date-fns';

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

        // Limit to 15,000 for safe execution length
        let countQuery = supabase.from('sales').select('count', { count: 'exact', head: true });
        if (store !== 'Todas') countQuery = countQuery.eq('loja', store);
        const { count } = await countQuery;
        
        let fetchCount = Math.min(count || 0, 15000);
        let records: any[] = [];
        
        if (fetchCount > 0) {
            let dataQuery = supabase.from('sales')
                .select('id, data, loja, cliente, telefone, items, valor, produto')
                .order('data', { ascending: false })
                .limit(fetchCount);
                
            if (store !== 'Todas') dataQuery = dataQuery.eq('loja', store);
            const { data } = await dataQuery;
            if (data) records = data;
        }

        const parsedRecords = records.map(r => ({
            ...r,
            data: new Date(r.data),
            items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || [])
        }));

        const metrics = calculateCrmMetrics(parsedRecords);
        const periodStats = calculatePeriodStats(parsedRecords, parsedRecords); // simplified base vs base logic for internal structure matching

        // 1. Recovery
        const recoveryList = metrics.profiles
            .filter(p => p.recency > 30 && p.totalSpent > 100)
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 20);

        const inactivePrecious = metrics.profiles.filter(p => p.recency > 20 && p.totalSpent > 50);
        const estimatedMonthlyLoss = inactivePrecious.reduce((acc, p) => acc + (p.totalSpent / Math.max(differenceInDays(new Date(), p.firstVisitDate) / 30, 1)), 0);

        // 2. Opportunities
        const opportunities = {
            onlyWash: periodStats.onlyWashList.slice(0, 10),
            onlyDry: periodStats.onlyDryList.slice(0, 10)
        };

        // 3. Machine BI
        const machineMap = new Map<string, any>();
        const recentRecords = parsedRecords.slice(0, 5000); // 5000 most recent because array is descending!

        for (let i = 0; i < recentRecords.length; i++) {
            const r = recentRecords[i];
            if (!r.items || r.items.length === 0) continue;

            for (let j = 0; j < r.items.length; j++) {
                const item = r.items[j];
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
                 inactive30: metrics.customerStats.inactive30,
                 globalAverageTicket: metrics.globalAverageTicket 
             }
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
