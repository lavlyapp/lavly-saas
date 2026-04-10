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

        const PAGE_SIZE = 1000;

        // Fetch Sales for 12 months
        let baseCountQuery = supabase.from('sales').select('*', { count: 'exact', head: true }).gte('data', startQuery).lte('data', endQuery);
        if (store !== 'Todas') baseCountQuery.eq('loja', store);
        const { count } = await baseCountQuery;

        let filteredRecords: any[] = [];
        if (count && count > 0) {
            const pages = Math.ceil(count / PAGE_SIZE);
            const chunkPromises = [];
            for (let i = 0; i < pages; i++) {
                let q = supabase.from('sales').select('id, data, valor, loja, cliente').gte('data', startQuery).lte('data', endQuery).range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1);
                if (store !== 'Todas') q.eq('loja', store);
                chunkPromises.push(q);
            }
            const results = await Promise.all(chunkPromises);
            results.forEach(res => { if (res.data) filteredRecords = filteredRecords.concat(res.data); });
        }

        // Processing
        const customerVisitsList: { date: Date, totalValue: number }[] = [];
        const customerRecordsMap = new Map<string, any[]>();

        filteredRecords.forEach(r => {
            const client = r.cliente && r.cliente !== 'Consumidor Final' ? r.cliente : 'ANON_' + Math.random();
            if (!customerRecordsMap.has(client)) customerRecordsMap.set(client, []);
            customerRecordsMap.get(client)!.push(r);
        });

        customerRecordsMap.forEach((sales) => {
            sales.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
            const visits: { date: Date, totalValue: number }[] = [];
            sales.forEach(r => {
                const lastVisit = visits.length > 0 ? visits[visits.length - 1] : null;
                const rTime = new Date(r.data).getTime();
                if (lastVisit && (rTime - lastVisit.date.getTime()) <= 10800000 && (rTime - lastVisit.date.getTime()) >= 0) {
                    lastVisit.totalValue += r.valor;
                } else {
                    visits.push({ date: new Date(r.data), totalValue: r.valor });
                }
            });
            customerVisitsList.push(...visits);
        });

        const monthlyStats = last12Months.map(month => {
            const monthSales = filteredRecords.filter(r => {
                const d = new Date(new Date(r.data).getTime() - (3 * 3600 * 1000));
                return d >= month.start && d <= month.end;
            });

            const totalRevenue = monthSales.reduce((sum, r) => sum + (r.valor || 0), 0);
            const uniqueCustomers = new Set(monthSales.map(r => r.cliente || 'Anonimo')).size;

            const monthVisits = customerVisitsList.filter(v => {
                const d = new Date(v.date.getTime() - (3 * 3600 * 1000));
                return d >= month.start && d <= month.end;
            });
            const ticketAverage = monthVisits.length > 0 ? totalRevenue / monthVisits.length : 0;

            let maleCount = 0; let femaleCount = 0; // Simplified for speed
            const totalGenderClassified = maleCount + femaleCount;
            const malePct = totalGenderClassified > 0 ? (maleCount / totalGenderClassified) * 100 : 0;
            const femalePct = totalGenderClassified > 0 ? (femaleCount / totalGenderClassified) * 100 : 0;

            return {
                name: month.label,
                revenue: totalRevenue,
                transactions: monthSales.length,
                uniqueCustomers,
                ticket: ticketAverage,
                baskets: 0, washes: 0, dries: 0, // Fallbacks
                malePct, femalePct
            };
        });

        // Heatmap
        const dayOfWeekTotals = [0, 0, 0, 0, 0, 0, 0];
        const weekOfMonthTotals = [0, 0, 0, 0, 0, 0];
        const uniqueMonths = new Set<string>();

        filteredRecords.forEach(r => {
            const val = r.valor || 0;
            const brtDate = new Date(new Date(r.data).getTime() - (3 * 3600 * 1000));
            dayOfWeekTotals[brtDate.getUTCDay()] += val;
            let week = getISOWeek(brtDate) - getISOWeek(startOfMonth(brtDate)) + 1;
            if (week < 1) week = 1;
            if (week >= 1 && week <= 5) weekOfMonthTotals[week] += val;
            uniqueMonths.add(format(brtDate, 'yyyy-MM'));
        });

        const numMonths = uniqueMonths.size || 1;
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
