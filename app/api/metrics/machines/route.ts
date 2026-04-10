import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const store = searchParams.get('store') || 'Todas';
        const period = searchParams.get('period') || 'today';

        const cookieStore = await cookies();
        const authHeader = request.headers.get('Authorization');

        let supabase;
        if (authHeader) {
            const { createClient } = await import('@supabase/supabase-js');
            supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: authHeader } } });
        } else {
            supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } });
        }

        // Time boundaries
        const nowBrt = new Date(Date.now() - (3 * 3600 * 1000));
        let interval: { start: Date; end: Date };

        switch (period) {
            case 'today':
                interval = { start: startOfDay(nowBrt), end: endOfDay(nowBrt) }; break;
            case 'yesterday':
                const yesterday = subDays(nowBrt, 1);
                interval = { start: startOfDay(yesterday), end: endOfDay(yesterday) }; break;
            case 'thisMonth':
                interval = { start: startOfMonth(nowBrt), end: endOfMonth(nowBrt) }; break;
            case 'lastMonth':
                const lastMonth = subMonths(nowBrt, 1);
                interval = { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }; break;
            default:
                interval = { start: startOfDay(nowBrt), end: endOfDay(nowBrt) };
        }

        const startQuery = interval.start.toISOString();
        const endQuery = interval.end.toISOString();

        // Let's use RPC if available or just raw select
        // 'orders' is smaller, we can fetch all in period
        let q = supabase.from('orders').select('*').gte('data', startQuery).lte('data', endQuery);
        if (store !== 'Todas') q.eq('loja', store);
        
        const { data: filteredOrders, error } = await q.limit(10000); // 10k is way more than enough for a single month config

        if (!filteredOrders || filteredOrders.length === 0) {
            return NextResponse.json({ success: true, payload: { machines: [], summary: {}, topRevenueMachine: null, topCyclesMachine: null, rawOrders: [] } });
        }

        const machineMap = new Map<string, any>();
        let totalRevenueAll = 0;
        let totalCyclesAll = 0;

        filteredOrders.forEach((item: any) => {
            const machineId = item.machine;
            if (!machineId) return;

            let isWash = (item.service || '').toLowerCase().includes('lav') || machineId.toLowerCase().includes('lav') || machineId.toLowerCase().includes('inferior');
            let isDry = (item.service || '').toLowerCase().includes('sec') || machineId.toLowerCase().includes('sec') || machineId.toLowerCase().includes('superior');

            if (!isWash && !isDry) {
                const numMatch = machineId.match(/\d+/);
                if (numMatch) {
                    const num = parseInt(numMatch[0], 10);
                    if (num % 2 !== 0) isDry = true;
                    else isWash = true;
                } else isWash = true;
            }

            const type = isWash ? 'Lavadora' : (isDry ? 'Secadora' : 'Outro');

            const current = machineMap.get(machineId) || {
                id: machineId, type, cycles: 0, totalRevenue: 0, lastUse: new Date(0)
            };

            const val = item.valor || item.value || 0;
            current.cycles++;
            current.totalRevenue += val;
            totalCyclesAll++;
            totalRevenueAll += val;

            const itemDate = new Date(item.data);
            if (itemDate > current.lastUse) current.lastUse = itemDate;

            machineMap.set(machineId, current);
        });

        const machineList = Array.from(machineMap.values()).map(m => ({
            ...m,
            revenueShare: totalRevenueAll > 0 ? (m.totalRevenue / totalRevenueAll) : 0,
            cycleShare: totalCyclesAll > 0 ? (m.cycles / totalCyclesAll) : 0,
            avgTicket: m.cycles > 0 ? m.totalRevenue / m.cycles : 0
        }));

        machineList.sort((a, b) => {
            if (a.type !== b.type) {
                if (a.type === 'Lavadora') return -1;
                if (b.type === 'Lavadora') return 1;
                if (a.type === 'Secadora') return -1;
                if (b.type === 'Secadora') return 1;
            }
            return a.id.localeCompare(b.id, undefined, { numeric: true });
        });

        const topRev = [...machineList].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
        const topCyc = [...machineList].sort((a, b) => b.cycles - a.cycles)[0];

        return NextResponse.json({
             success: true, 
             payload: { machines: machineList, summary: { totalRevenueAll, totalCyclesAll }, topRevenueMachine: topRev, topCyclesMachine: topCyc, rawOrders: filteredOrders }
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
