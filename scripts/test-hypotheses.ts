import { getVMPayCredentials } from '../lib/vmpay-config';
import { syncVMPaySales } from '../lib/vmpay-client';

async function main() {
    console.log("Hypothesis Test: UTC vs BRT Raw Timestamps...");
    const credentials = await getVMPayCredentials();
    const cred = credentials.find(c => c.name.toLowerCase().includes("walter"));

    // Fetch wide range
    const startObj = new Date(Date.UTC(2026, 2, 14, 0, 0, 0)); 
    const endObj = new Date(Date.UTC(2026, 2, 14, 23, 59, 59));
    
    // Test the RAW fetch without our sync client filtering
    const startStr = "2026-03-14T00:00:00"; 
    const endStr = "2026-03-14T23:59:59";
    const url = `https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=100`;

    const r = await fetch(url, { headers: { 'x-api-key': cred.apiKey } });
    const data = await r.json();
    
    const content = data.content || [];
    
    // We want to see how many "Today" sales there are if we treat the timestamp as local (BRT)
    let totalAsLocal = 0;
    // We want to see how many "Today" sales there are if we treat the timestamp as UTC and convert to BRT
    let totalAsUTC = 0;

    content.forEach((s: any) => {
        const rawTs = s.data; // e.g. "2026-03-14T10:00:00"

        // Hypothesis A: VMPay sends Local time (BRT).
        if (rawTs.startsWith("2026-03-14")) {
            totalAsLocal += s.valor;
        }

        // Hypothesis B: VMPay sends UTC time (Z). Lavly converts to BRT (-3 hrs).
        const asUTC = new Date(rawTs + "Z");
        const asBRT = new Date(asUTC.getTime() - 3 * 3600 * 1000);
        const brtString = asBRT.toISOString().split('T')[0];

        if (brtString === "2026-03-14") {
            totalAsUTC += s.valor;
        }
    });

    console.log(`\nResults for JOSE WALTER "Today" (Mar 14):`);
    console.log(`If VMPay returns BRT: R$ ${totalAsLocal.toFixed(2)}`);
    console.log(`If VMPay returns UTC: R$ ${totalAsUTC.toFixed(2)}`);
    console.log(`Target from User screenshot: R$ 615.10`);
}

main().catch(console.error);
