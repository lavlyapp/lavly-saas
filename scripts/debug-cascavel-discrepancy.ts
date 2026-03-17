import { getVMPayCredentials } from '../lib/vmpay-config';
import { supabase } from '../lib/supabase';
import { syncVMPaySales } from '../lib/vmpay-client';

async function main() {
    console.log("Analyzing Discrepancy for Lavateria Cascavel for Today...");
    const credentials = await getVMPayCredentials();
    const cred = credentials.find(c => c.name.toLowerCase().includes("cascavel"));
    if (!cred) return console.log("Cascavel not found");

    // Today in BRT
    const startOfDayStr = new Date().toISOString().substring(0, 10) + 'T00:00:00.000Z';
    // Actually BRT is UTC-3, so today midnight BRT is yesterday 21:00 UTC (roughly) or today 03:00 UTC depending on strict date logic.
    // The safest is to query DB between yesterday and tomorrow and group by BRT day.

    const { data: dbSales, error } = await supabase
        .from('sales')
        .select('*')
        .eq('loja', 'LAVATERIA CASCAVEL')
        .order('data', { ascending: false })
        .limit(200);

    let todayDbCount = 0;
    let todayDbValue = 0;
    
    // Convert DB to BRT day
    dbSales?.forEach(s => {
        const d = new Date(s.data);
        const brtDate = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const todayBrt = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        if (brtDate === todayBrt) {
            todayDbCount++;
            todayDbValue += Number(s.valor);
        }
    });

    console.log(`[Database] Today (BRT) Sales: ${todayDbCount} | Total Value: R$ ${todayDbValue.toFixed(2)}`);

    // Now fetch from VMPay directly (yesterday and today)
    const now = new Date();
    const startOfYesterday = new Date(now);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0,0,0,0);
    
    console.log(`[VMPay API] Fetching from ${startOfYesterday.toISOString()} to ${now.toISOString()}`);
    const vmpaySales = await syncVMPaySales(startOfYesterday, now, cred);
    
    let yesterdayVmpayCount = 0;
    let yesterdayVmpayValue = 0;
    let todayVmpayCount = 0;
    let todayVmpayValue = 0;
    
    const todayBrt = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const yesterdayBrtObj = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayBrt = yesterdayBrtObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    vmpaySales.forEach(s => {
        const d = new Date(s.data);
        const brtDate = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        
        if (brtDate === todayBrt) {
            todayVmpayCount++;
            todayVmpayValue += Number(s.valor);
        } else if (brtDate === yesterdayBrt) {
            yesterdayVmpayCount++;
            yesterdayVmpayValue += Number(s.valor);
        }
    });

    console.log(`[VMPay API] Yesterday (BRT) Sales: ${yesterdayVmpayCount} | Total Value: R$ ${yesterdayVmpayValue.toFixed(2)}`);
    console.log(`[VMPay API] Today (BRT) Sales: ${todayVmpayCount} | Total Value: R$ ${todayVmpayValue.toFixed(2)}`);
    
    // Find missing
    if (vmpaySales.length > 0 && dbSales) {
        const dbIds = new Set(dbSales.map(s => s.id));
        const missing = vmpaySales.filter(v => !dbIds.has(v.id));
        console.log(`Missing from DB: ${missing.length}`);
        if(missing.length > 0) {
           console.log("Sample missing:", missing[0]);
        }
    }
}

main().catch(console.error);
