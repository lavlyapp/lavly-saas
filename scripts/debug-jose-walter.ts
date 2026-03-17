import { getVMPayCredentials } from '../lib/vmpay-config';
import { syncVMPaySales } from '../lib/vmpay-client';

async function main() {
    console.log("Analyzing Discrepancy for JOSE WALTER...");
    const credentials = await getVMPayCredentials();
    const cred = credentials.find(c => c.name.toLowerCase().includes("walter"));
    if (!cred) return console.log("Jose Walter not found");

    const now = new Date();
    const startOfTarget = new Date(Date.UTC(2026, 2, 11, 0, 0, 0));
    
    console.log(`[VMPay API] Fetching from ${startOfTarget.toISOString()} to ${now.toISOString()}`);
    const vmpaySales = await syncVMPaySales(startOfTarget, now, cred);
    
    let totalAsLocal = 0;
    let totalAsUTC = 0;

    vmpaySales.forEach(s => {
        const jsDate = s.data as unknown as Date;
        const rawTs = jsDate.toISOString(); 
        
        // Buggy VMPay Dashboard grouping (Reads UTC string directly as local date)
        if (rawTs.startsWith("2026-03-14")) {
            totalAsLocal += s.valor;
        }

        // Correct Lavly grouping (Shifts to BRT UTC-3 first)
        const jsDateLocal = new Date(rawTs.replace('Z', '') + "Z");
        const asBRT = new Date(jsDateLocal.getTime() - 3 * 3600 * 1000);
        const brtString = asBRT.toISOString().split('T')[0];

        if (brtString === "2026-03-14") {
            totalAsUTC += s.valor;
        }
    });

    console.log(`\nResults for JOSE WALTER "Today" (Mar 14):`);
    console.log(`If VMPay returns BRT: R$ ${totalAsLocal.toFixed(2)}`);
    console.log(`If VMPay returns UTC: R$ ${totalAsUTC.toFixed(2)}`);
}

main().catch(console.error);
