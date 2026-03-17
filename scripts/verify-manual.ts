import { supabaseAdmin } from '../lib/supabase-admin';

async function verifyManual() {
    const { data: dbSales } = await supabaseAdmin
        .from('sales')
        .select('*')
        .eq('loja', 'Lavateria JOQUEI')
        .gte('data', '2026-03-13T00:00:00.000Z')
        .order('data', { ascending: true });

    let todayTotal = 0;
    let todayCount = 0;
    
    let yesterdayTotal = 0;
    let yesterdayCount = 0;

    console.log("--- RAW DB SALES (Last 48h) ---");
    dbSales?.forEach(r => {
        // Dashboard uses: new Date(sale.data).toLocaleDateString('pt-BR')
        const jsDate = new Date(r.data);
        const brtStr = jsDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        
        if (brtStr === "14/03/2026") {
            todayTotal += r.valor;
            todayCount++;
            console.log(`[TODAY] ${r.id} | DB TZ: ${r.data} | R$ ${r.valor}`);
        } else if (brtStr === "13/03/2026") {
            yesterdayTotal += r.valor;
            yesterdayCount++;
            console.log(`[YESTERDAY] ${r.id} | DB TZ: ${r.data} | R$ ${r.valor}`);
        }
    });

    console.log(`\nTotals according to Lavly Browser Parser:`);
    console.log(`13/03 (Ontem): ${yesterdayCount} ciclos | R$ ${yesterdayTotal.toFixed(2)}`);
    console.log(`14/03 (Hoje) : ${todayCount} ciclos | R$ ${todayTotal.toFixed(2)}`);
}

verifyManual();
