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

        const nowUtc = new Date();
        
        // Helper to get BRT midnight in UTC for exact calendar bounding
        const getBRTMidnightUTC = (date: Date, offsetDays: number = 0) => {
            const brtTzOffset = 3 * 60 * 60 * 1000;
            // Create a local BRT date context
            const brtDate = new Date(date.getTime() - brtTzOffset);
            // Reset to midnight in BRT
            brtDate.setUTCHours(0, 0, 0, 0);
            // Apply offset (e.g., -1 for yesterday)
            brtDate.setUTCDate(brtDate.getUTCDate() + offsetDays);
            // Convert back to UTC boundary
            return new Date(brtDate.getTime() + brtTzOffset);
        };

        const todayStartUTC = getBRTMidnightUTC(nowUtc, 0);
        const yesterdayStartUTC = getBRTMidnightUTC(nowUtc, -1);
        const thisMonthStartUTC = new Date(todayStartUTC);
        thisMonthStartUTC.setUTCDate(1); // 1st of current BRT month

        let startQuery: string;
        let endQuery: string;

        switch (period) {
            case 'today':
                startQuery = todayStartUTC.toISOString();
                endQuery = new Date(todayStartUTC.getTime() + 24 * 3600 * 1000).toISOString();
                break;
            case 'yesterday':
                startQuery = yesterdayStartUTC.toISOString();
                endQuery = todayStartUTC.toISOString();
                break;
            case 'thisMonth':
                startQuery = thisMonthStartUTC.toISOString();
                endQuery = new Date(todayStartUTC.getTime() + 24 * 3600 * 1000).toISOString(); // Up to end of today
                break;
            case 'lastMonth':
                const lastMonthStart = new Date(thisMonthStartUTC);
                lastMonthStart.setUTCMonth(lastMonthStart.getUTCMonth() - 1);
                startQuery = lastMonthStart.toISOString();
                endQuery = thisMonthStartUTC.toISOString();
                break;
            case 'last48h':
                startQuery = new Date(nowUtc.getTime() - 48 * 3600 * 1000).toISOString();
                endQuery = nowUtc.toISOString();
                break;
            default:
                startQuery = new Date(nowUtc.getTime() - 24 * 3600 * 1000).toISOString();
                endQuery = nowUtc.toISOString();
        }

        // RBAC Enforcement Feature
        let accessibleStores: string[] = [];
        let rbacActive = false;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            const { data: userProfile } = await supabase.from('profiles').select('role, assigned_stores').eq('id', session.user.id).single();
            if (userProfile && userProfile.role !== 'admin' && userProfile.assigned_stores && userProfile.assigned_stores.length > 0) {
                accessibleStores = userProfile.assigned_stores;
                rbacActive = true;
            }
        }

        // 🚨 CRITICAL FIX: The 'orders' table might have restrictive or missing RLS policies blocking authenticated reads.
        // Since we explicitly enforce RBAC securely in Node above, we can safely use the Service Role to grab the data.
        const { createClient } = await import('@supabase/supabase-js');
        const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        let filteredOrders: any[] = [];
        let hasMore = true;
        let page = 0;
        
        // Supabase PostgREST has a hard 'max-rows' limit (usually 1000). 
        // We must paginate gracefully to ensure we don't truncate recent records!
        while (hasMore) {
            let q = adminClient.from('orders')
                .select('*')
                .gte('data', startQuery)
                .lte('data', endQuery)
                .order('data', { ascending: false })
                .range(page * 1000, (page + 1) * 1000 - 1);

            if (store !== 'Todas') {
                if (rbacActive && !accessibleStores.includes(store)) {
                    return NextResponse.json({ success: true, payload: { machines: [], summary: {}, topRevenueMachine: null, topCyclesMachine: null, rawOrders: [] } });
                }
                q.eq('loja', store);
            } else if (rbacActive) {
                q.in('loja', accessibleStores);
            }

            const { data, error } = await q;

            if (error || !data || data.length === 0) {
                hasMore = false;
            } else {
                filteredOrders.push(...data);
                page++;
                if (data.length < 1000) hasMore = false;
                if (page > 15) hasMore = false; // Failsafe limit: 15,000 rows max memory limit
            }
        }

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
