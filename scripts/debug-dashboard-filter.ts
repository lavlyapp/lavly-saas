import { getVMPayCredentials } from '../lib/vmpay-config';
import { supabaseAdmin } from '../lib/supabase-admin';

async function main() {
    console.log("Analyzing Dashboard Local Time Filtering...");
    const credentials = await getVMPayCredentials();
    const cred = credentials.find(c => c.name.toLowerCase().includes("joquei"));
    if (!cred) return;

    // Fetch *everything* from the last 24 hours to see how the dashboard groups it
    const { data: dbSales } = await supabaseAdmin
        .from('sales')
        .select('*')
        .eq('loja', cred.name)
        .order('data', { ascending: true });

    let lavlyTodayTotal = 0;
    
    // Simulate DashboardClient.tsx
    // const todayBrt = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const todayBrt = "14/03/2026"; // Hardcode for stability

    dbSales?.forEach(r => {
        // Dashboard Strict BRT Daily Filter logic (from vmpay_integration.md)
        // 1. Take raw DB date (e.g. 2026-03-14T00:12:24+00:00)
        // 2. new Date() parses it to local JS time
        // 3. Shift by -3h to force BRT representation inside UTC wrapper
        const dbDate = new Date(r.data);
        const brtDateStr = dbDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        
        if (brtDateStr === todayBrt) {
            lavlyTodayTotal += r.valor;
            console.log(`[LAVLY TODAY] ${r.id} | DB UTC: ${r.data} | BRT: ${brtDateStr} | R$ ${r.valor}`);
        } else if (brtDateStr === "13/03/2026") {
            // console.log(`[LAVLY YESTERDAY] ${r.id} | DB UTC: ${r.data} | BRT: ${brtDateStr} | R$ ${r.valor}`);
        }
    });

    console.log(`Total Lavly Dashboard: R$ ${lavlyTodayTotal.toFixed(2)}`);
}

main().catch(console.error);
