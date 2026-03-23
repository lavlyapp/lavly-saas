import { getVMPayCredentials, VMPAY_API_BASE_URL } from '../lib/vmpay-config';

async function main() {
    const creds = await getVMPayCredentials();
    const cred = creds.find(c => c.name.includes('DUMONT')) || creds[0];
    
    // Narrow the window to the last 4 hours to guarantee the most recent records are easily found
    const nowLocal = new Date();
    // VMPay expects UTC strings for the dataInicio/Termino params!
    const endStr = new Date(nowLocal.getTime() + 3600000).toISOString(); 
    const startStr = new Date(nowLocal.getTime() - 4 * 3600 * 1000).toISOString();
    
    // Let's grab 100 on page 0 and just print the max one
    const url = `${VMPAY_API_BASE_URL}/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=100`;
    const res = await fetch(url, { headers: { 'x-api-key': cred.apiKey } });
    const data = await res.json();
    
    if (data.length > 0) {
        // Sort explicitly by string compare
        data.sort((a: any, b: any) => b.data.localeCompare(a.data));
        console.log("SALE RAW DATE FIELD (LATEST):", data[0].data);
        console.log("Current System Time:", new Date().toString());
    } else {
        console.log("No sales in the last 4 hours window using UTC params.");
    }
}

main();
