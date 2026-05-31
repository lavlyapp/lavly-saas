import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getDaysInMonth } from 'date-fns';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Aumenta o limite de 10s para 60s na Vercel

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
        function getBrtIsoStart(dateStr: string) {
            return new Date(`${dateStr}T00:00:00-03:00`).toISOString();
        }
        function getBrtIsoEnd(dateStr: string) {
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

        // --- 2. SINGLE RPC Call (corrige o bug de dupla chamada ao banco) ---
        const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        console.log(`[API Metrics] Running RPC for ${period} on ${store}...`);

        // Executa as duas queries em PARALELO (ao mesmo tempo) ao invés de sequencial
        const [mainResult, last30Result] = await Promise.all([
            supabase.rpc('get_financial_dashboard_metrics', {
                p_store: store,
                p_start_date: queryStartIso,
                p_end_date: queryEndIso
            }),
            // Só busca os dados de 30 dias para períodos que precisam de projeção
            (period === 'thisMonth' || period === 'today' || period === 'yesterday')
                ? supabase.rpc('get_financial_dashboard_metrics', {
                    p_store: store,
                    p_start_date: thirtyDaysAgoIso,
                    p_end_date: now.toISOString()
                })
                : Promise.resolve({ data: null, error: null })
        ]);

        const { data: rpcData, error: rpcError } = mainResult;

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

        // --- 4. Compute last30DaysAvg using parallel result ---
        let last30DaysAvg = 0;

        if (period === 'thisMonth' || period === 'today' || period === 'yesterday') {
            if (last30Result?.data?.salesMetrics) {
                last30DaysAvg = last30Result.data.salesMetrics.totalRevenue / 30;
            }
        } else if (period === 'lastMonth') {
            const vDate = metrics.period?.startDate ? new Date(metrics.period.startDate) : new Date();
            const daysInMonth = getDaysInMonth(vDate);
            if (metrics.salesMetrics?.totalRevenue) {
                last30DaysAvg = metrics.salesMetrics.totalRevenue / (daysInMonth || 30);
            }
        } else {
            const daysDiff = metrics.period?.startDate && metrics.period?.endDate ? 
                Math.max(1, Math.round((new Date(metrics.period.endDate).getTime() - new Date(metrics.period.startDate).getTime()) / 86400000)) 
                : 30;
            if (metrics.salesMetrics?.totalRevenue) {
                last30DaysAvg = metrics.salesMetrics.totalRevenue / daysDiff;
            }
        }

        const viewDate = metrics.period?.startDate ? new Date(metrics.period.startDate) : new Date();
        const daysInViewMonth = getDaysInMonth(viewDate);
        const projection = last30DaysAvg * daysInViewMonth;

        // Force ticket recalculation outside SQL to prevent discrepancies with BRLD exclusions
        const uniqueC = metrics.period.uniqueCustomers || 0;
        const totalT = metrics.salesMetrics.totalTransactions || 0;
        const finalTicket = totalT > 0 ? (metrics.salesMetrics.totalRevenue / totalT) : 0;

        return NextResponse.json({
            success: true,
            payload: {
                summary: {
                    totalSales: metrics.salesMetrics.totalTransactions,
                    totalValue: metrics.salesMetrics.totalRevenue,
                    startDate: metrics.period.startDate,
                    endDate: metrics.period.endDate,
                    uniqueCustomers: uniqueC,
                    ticketMedio: finalTicket
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
