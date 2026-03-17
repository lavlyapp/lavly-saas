import { getVMPayCredentials } from '../lib/vmpay-config';

async function main() {
    console.log("Fetching RAW VMPay Sales for SHOPPING (Maracanau)...");
    const credentials = await getVMPayCredentials();
    const cred = credentials.find(c => c.name.toLowerCase().includes("maracanau"));
    if (!cred) return console.log("Maracanau not found");

    // Fetch from 00:00:00 to 23:59:59 exactly as a human writes it
    const startStr = "2026-03-14T00:00:00";
    const endStr = "2026-03-14T23:59:59";
    
    const url = `https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=100`;

    const r = await fetch(url, { headers: { 'x-api-key': cred.apiKey } });
    const text = await r.text();
    console.log(`[RAW VMPay API] Maracanau dataInicio=${startStr}`);
    console.log(`Response length: ${text.length}`);
    try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
            console.log(`It's an array with ${data.length} elements!`);
            let totalVal = 0;
            data.forEach(s => totalVal += s.valor);
            console.log(`Sum of these raw elements: R$ ${totalVal.toFixed(2)}`);
            if(data.length > 0) console.log(`First item:`, data[0]);
        } else {
            console.log("It's an object:", Object.keys(data));
        }
    } catch(e) {
        console.log("Failed to parse JSON:", text.substring(0, 100));
    }
}

main().catch(console.error);
