import { getVMPayCredentials } from '../lib/vmpay-config';
import { supabaseAdmin } from '../lib/supabase-admin';

async function main() {
    console.log("Deep Dive: JOQUEI Sales Compare (Today)");
    const credentials = await getVMPayCredentials();
    const cred = credentials.find(c => c.name.toLowerCase().includes("joquei"));
    if (!cred) return console.log("JOQUEI not found");

    // 1. Fetch RAW using the VMPay Sync Client to guarantee pagination handles it
    const startObj = new Date(Date.UTC(2026, 2, 14, 0, 0, 0));
    const endObj = new Date(Date.UTC(2026, 2, 14, 23, 59, 59));
    
    // We import syncVMPaySales
    const { syncVMPaySales } = await import('../lib/vmpay-client');
    const vmpaySalesRaw = await syncVMPaySales(startObj, endObj, cred);
    
    const vmpayIds = new Set(vmpaySalesRaw.map((s: any) => s.id));
    
    let vmpayTotal = 0;
    vmpaySalesRaw.forEach((s: any) => vmpayTotal += s.valor);

    console.log(`[VMPay API] Total Elements: ${vmpaySalesRaw.length} | Sum: R$ ${vmpayTotal.toFixed(2)}`);

    // 2. Fetch from Supabase directly
    // Since Supabase stores in UTC, "today" in BRT means >= 2026-03-14T03:00:00Z
    const todayStartUTC = "2026-03-14T03:00:00.000Z";
    
    const { data: dbSales, error } = await supabaseAdmin
        .from('sales')
        .select('*')
        .eq('loja', cred.name)
        .gte('data', todayStartUTC)
        .order('data', { ascending: true });
        
    if (error) return console.error("DB Fetch Error:", error);
    
    let dbTotal = 0;
    dbSales?.forEach(s => dbTotal += Number(s.valor));
    
    console.log(`[Supabase DB] Total Elements: ${dbSales?.length} | Sum: R$ ${dbTotal.toFixed(2)}`);
    
    // 3. Find missing IDs
    console.log("\n--- EXAMINING MISSING SALES (In API but NOT in DB) ---");
    const dbIds = new Set(dbSales?.map(s => s.id));
    
    const missingInDb = vmpaySalesRaw.filter((s: any) => !dbIds.has(s.id));
    let missingSum = 0;
    missingInDb.forEach((s: any) => {
        missingSum += s.valor;
        console.log(`Missing ID: ${s.id} | Date: ${s.data} | Value: ${s.valor} | Pagamento: ${s.formaPagamento}`);
    });
    console.log(`Total Missing Value: R$ ${missingSum.toFixed(2)}`);
    
    if (missingInDb.length === 0 && vmpayTotal !== dbTotal) {
        console.log("\nWARNING: All IDs exist, but totals differ! Is there a partial value mismatch?");
    }
}

main().catch(console.error);
