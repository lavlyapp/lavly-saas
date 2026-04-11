import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { subMonths, startOfMonth, endOfMonth, format, getISOWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const safeFormatWeek = (date: Date) => {
    const startWeek = getISOWeek(startOfMonth(date));
    const currentWeek = getISOWeek(date);
    let weekOfMonth = currentWeek - startWeek + 1;
    if (weekOfMonth < 1) weekOfMonth = 1;
    // @ts-ignore
    return `S${weekOfMonth} / ${format(date, 'MMM', { locale: ptBR })}`;
};

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

        // 12 Months Boundaries
        const nowBrt = new Date(Date.now() - (3 * 3600 * 1000));
        const last12Months = [];
        for (let i = 11; i >= 0; i--) {
            const d = subMonths(nowBrt, i);
            last12Months.push({
                start: startOfMonth(d),
                end: endOfMonth(d),
                // @ts-ignore
                label: format(d, 'MMM yy', { locale: ptBR }),
                yearMonth: format(d, 'yyyy-MM')
            });
        }

        const startQuery = last12Months[0].start.toISOString();
        const endQuery = last12Months[11].end.toISOString();

        // Execute Native Cloud Computing inside DB
        const { data: dbData, error: dbError } = await supabase.rpc('get_comparative_financial_metrics', {
            p_store: store,
            p_start_date: startQuery,
            p_end_date: endQuery
        });

        if (dbError) {
             throw new Error(dbError.message || "Native RPC missing or failed");
        }

        const rawMonthly = dbData?.monthlyStats || [];
        const rawHeatmap = dbData?.heatmap || [];

        // Build guaranteed 12-month sequential array for chart
        const monthlyStats = last12Months.map(month => {
             const row = rawMonthly.find((r: any) => r.year_month === month.yearMonth);
             const revenue = parseFloat(row?.revenue || 0);
             const transactions = parseInt(row?.transactions || 0, 10);
             const uniqueCustomers = parseInt(row?.unique_customers || 0, 10);
             
             return {
                 name: month.label,
                 revenue,
                 transactions,
                 uniqueCustomers,
                 ticket: transactions > 0 ? revenue / transactions : 0, 
                 baskets: 0, washes: 0, dries: 0,
                 malePct: 0, femalePct: 0
             };
        });

        // Heatmap processing
        const dayOfWeekTotals = [0, 0, 0, 0, 0, 0, 0];
        const weekOfMonthTotals = [0, 0, 0, 0, 0, 0];
        const numMonths = last12Months.length || 1;

        rawHeatmap.forEach((h: any) => {
            const val = parseFloat(h.total || 0);
            if (h.dow >= 0 && h.dow < 7) dayOfWeekTotals[h.dow] += val;
            if (h.week_of_month >= 1 && h.week_of_month <= 5) weekOfMonthTotals[h.week_of_month] += val;
        });

        const daysLabel = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const heatmapData = {
            daysChart: daysLabel.map((l, i) => ({ name: l, revenue: dayOfWeekTotals[i] / numMonths, total: dayOfWeekTotals[i] })),
            weeksChart: [1, 2, 3, 4, 5].map(w => ({ name: `Semana ${w}`, revenue: weekOfMonthTotals[w] / numMonths, total: weekOfMonthTotals[w] }))
        };

        return NextResponse.json({ success: true, payload: { monthlyStats, heatmapData } });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
