import { supabaseAdmin } from '../lib/supabase-admin';

async function testFrontend() {
    const { data: records, error } = await supabaseAdmin
        .from('sales')
        .select('*')
        .eq('loja', 'Lavateria JOQUEI')
        .gte('data', '2026-03-10')
        .order('data', { ascending: false });
        
    if (error) return console.error(error);
    
    // Mimic the "today" of the print
    // The print was taken on March 14, so we simulate `now = 2026-03-14`
    const printDate = new Date("2026-03-14T12:00:00-03:00"); 
    
    const todayStr = printDate.toISOString().substring(0, 10);
    console.log(`Simulated frontend todayStr: ${todayStr}`);
    
    const filteredRecords = records.filter((r: any) => {
        if (!r.data) return false;
        // The exact code from FinancialDashboard.tsx:
        const dbDateStr = typeof r.data === 'string' ? r.data.substring(0, 10) : new Date(r.data).toISOString().substring(0, 10);
        return dbDateStr === todayStr;
    });
    
    let total = 0;
    filteredRecords.forEach((r: any) => total += Number(r.valor));
    
    console.log(`Frontend "Hoje" Sales: ${filteredRecords.length} | R$ ${total.toFixed(2)}`);
}

testFrontend();
