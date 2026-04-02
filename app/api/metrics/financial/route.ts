import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { startOfMonth, subMonths, endOfMonth, getDaysInMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'thisMonth';
        let store = searchParams.get('store') || 'Todas';
        const startCustom = searchParams.get('start');
        const endCustom = searchParams.get('end');

        // Create Authenticated Client ensuring RLS matches user
        const cookieStore = await cookies();
        const authHeader = request.headers.get('Authorization');
        
        let supabase;
        if (authHeader) {
            // Priority 1: Bearer Token (Dashboard)
            const { createClient } = await import('@supabase/supabase-js');
            supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { global: { headers: { Authorization: authHeader } } }
            );
        } else {
            // Priority 2: Cookies
            supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        getAll() { return cookieStore.getAll(); },
                        setAll(cookiesToSet) { }
                    }
                }
            );
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

        // Convert boundary strings to ISO boundaries for PostgreSQL
        function getBrtIsoStart(dateStr) {
            return new Date(`${dateStr}T00:00:00-03:00`).toISOString();
        }
        function getBrtIsoEnd(dateStr) {
            return new Date(`${dateStr}T23:59:59.999-03:00`).toISOString();
        }

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
        }

        // --- 2. Call Native Database RPC (Supabase Backend) ---
        console.log(`[API Metrics] Running RPC for ${period} on ${store}...`);
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_financial_dashboard_metrics', {
            p_store: store,
            p_start_date: queryStartIso,
            p_end_date: queryEndIso
        });

        if (rpcError || !rpcData) {
            console.error("RPC Error:", rpcError);
            throw new Error(rpcError?.message || "Function get_financial_dashboard_metrics is likely not installed in the database yet");
        }

        const metrics = rpcData;

        // --- 3. Compute Legacy Data Forms (Translate array to expected Object) ---
        const paymentStats = { debit: 0, credit: 0, pix: 0, voucher: 0, voucherDetails: {} as Record<string, number>, coupons: 0, others: 0, otherTypes: [] as string[] };
        
        metrics.paymentStats.forEach((r: any) => {
            const type = String(r.method || 'não identificado').toLowerCase();
            const value = Number(r.valor) || 0;
            if (type.includes('pix') || type.includes('qrcode')) paymentStats.pix += value;
            else if (type.includes('voucher') || type.includes('prepago') || type.includes('saldo')) paymentStats.voucher += value;
            else if (type.includes('credito') || type.includes('crédito') || type.includes('app') || type.includes('online')) paymentStats.credit += value;
            else if (type.includes('debito') || type.includes('débito') || type.includes('classico')) paymentStats.debit += value;
            else paymentStats.others += value;
        });

        // --- 4. Parallel Quick Counts (Averages & Coupons) ---
        const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const baseQuery = store !== 'Todas' ? supabase.from('sales').select('valor').eq('loja', store) : supabase.from('sales').select('valor');
        
        const qCoupons = supabase.from('sales').select('*', {count: 'exact', head: true}).gt('desconto', 0);
        if (store !== 'Todas') qCoupons.eq('loja', store);
        if (queryStartIso) qCoupons.gte('data', queryStartIso);
        if (queryEndIso) qCoupons.lte('data', queryEndIso);

        const qLast30 = baseQuery.gte('data', thirtyDaysAgoIso);
        
        let couponsRes = { count: 0 };
        let last30DaysAvg = 0;
        
        if (period === 'thisMonth' || period === 'today') {
            const [l30] = await Promise.all([
                supabase.rpc('get_financial_dashboard_metrics', { p_store: store, p_start_date: thirtyDaysAgoIso, p_end_date: now.toISOString() })
            ]);
            if (l30.data && l30.data.salesMetrics) {
                last30DaysAvg = l30.data.salesMetrics.totalRevenue / 30;
            }
        } else {
            // qCoupons.count has been temporarily disabled because doing COUNT(*) on raw sales table bypasses materialized views
            couponsRes = { count: 0 };
        }
        
        paymentStats.coupons = couponsRes.count || 0;

        const viewDate = metrics.period?.startDate ? new Date(metrics.period.startDate) : new Date();
        const daysInViewMonth = getDaysInMonth(viewDate);
        const projection = last30DaysAvg * daysInViewMonth;

        return NextResponse.json({
            success: true,
            payload: {
                summary: {
                    totalSales: metrics.salesMetrics.totalTransactions,
                    totalValue: metrics.salesMetrics.totalRevenue,
                    startDate: metrics.period.startDate,
                    endDate: metrics.period.endDate,
                    uniqueCustomers: metrics.period.uniqueCustomers
                },
                basketsMetrics: metrics.basketsMetrics,
                dailyData: metrics.dailyData,
                storeData: metrics.storeData,
                uniqueStoreCount: metrics.storeData.length,
                paymentStats,
                globalMetrics: {
                    last30DaysAvg,
                    projection,
                    daysInViewMonth
                }
            }
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
