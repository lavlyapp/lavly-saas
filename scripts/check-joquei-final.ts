import { supabaseAdmin } from '../lib/supabase-admin';
import { startOfDay, endOfDay, subDays } from 'date-fns';

async function checkJoqueiDays() {
    const { data: sales, error } = await supabaseAdmin
        .from('sales')
        .select('*')
        .eq('loja', 'Lavateria JOQUEI')
        .gte('data', '2026-03-11')
        .order('data', { ascending: true });
        
    if (error) return console.error(error);
    
    // Group by UTC day (Raw API string date)
    const utcTotals: Record<string, number> = {};
    const utcCounts: Record<string, number> = {};
    
    sales.forEach((s: any) => {
        // s.data is stored as "2026-03-14T03:00:00+00:00"
        // We isolate just the YYYY-MM-DD from the UTC representation!
        const utcDayStr = new Date(s.data).toISOString().substring(0, 10);
        
        if (!utcTotals[utcDayStr]) { utcTotals[utcDayStr] = 0; utcCounts[utcDayStr] = 0; }
        utcTotals[utcDayStr] += Number(s.valor);
        utcCounts[utcDayStr]++;
    });
    
    console.log("DB EXACT TOTALS (UTC DAYS):");
    for (const [day, total] of Object.entries(utcTotals)) {
        console.log(`${day}: ${utcCounts[day]} cycles | R$ ${total.toFixed(2)}`);
    }
}
checkJoqueiDays();
