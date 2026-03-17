import { getVMPayCredentials } from '../lib/vmpay-config';
import { syncVMPaySales } from '../lib/vmpay-client';

async function main() {
    console.log("Simulating VMPay Dashboard Timezone Bug vs Lavly Correct Timezone...");
    const credentials = await getVMPayCredentials();

    for (const storeName of ["WALTER", "MARACANAU"]) {
        const cred = credentials.find(c => c.name.toLowerCase().includes(storeName.toLowerCase()));
        if (!cred) continue;

        // Fetch wide range to ensure we capture midnight bleed
        // From Mar 13 00:00:00 UTC to Mar 14 23:59:59 UTC
        // JS Date uses local timezone, so we force UTC construct
        const start = new Date(Date.UTC(2026, 2, 13, 0, 0, 0)); // Month is 0-indexed (2 = March)
        const end = new Date(Date.UTC(2026, 2, 14, 23, 59, 59, 999));
        
        const sales = await syncVMPaySales(start, end, cred);

        let vmpayBuggedTotal = 0;
        let vmpayBuggedCount = 0;

        let lavlyCorrectTotal = 0;
        let lavlyCorrectCount = 0;

        sales.forEach(s => {
            const jsDate = s.data as unknown as Date;
            const rawDt = jsDate.toISOString(); 

            // Buggy VMPay Dashboard grouping (Reads UTC string directly as local date)
            if (rawDt.startsWith("2026-03-14")) {
                vmpayBuggedTotal += s.valor;
                // Add all cestos
                const items = s.items || [];
                vmpayBuggedCount += items.length || 1; 
            }

            // Correct Lavly grouping (Shifts to BRT UTC-3 first)
            const brtDate = new Date(jsDate.getTime() - 3 * 3600 * 1000);
            const brtString = brtDate.toISOString().split('T')[0];

            if (brtString === "2026-03-14") {
                lavlyCorrectTotal += s.valor;
                lavlyCorrectCount += s.items ? s.items.length : 1;
            }
        });

        console.log(`\n=== ${cred.name} ===`);
        console.log(`VMPay Bugged Dashboard : R$ ${vmpayBuggedTotal.toFixed(2)} | ${vmpayBuggedCount} ciclos`);
        console.log(`Lavly Correct Dashboard: R$ ${lavlyCorrectTotal.toFixed(2)} | ${lavlyCorrectCount} cestos`);
    }
}

main().catch(console.error);
