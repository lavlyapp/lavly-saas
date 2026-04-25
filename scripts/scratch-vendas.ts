import fetch from 'node-fetch';

const key = 'e8689749-58b1-4a3e-8f1c-11d1a5e2b42e'; // Cascavel
const BASE_URL = 'https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1';

async function main() {
    // 1. Fetch 1 sale
    const startStr = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const endStr = new Date().toISOString();
    
    const url = `${BASE_URL}/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=1`;
    const res = await fetch(url, { headers: { 'x-api-key': key } });
    const data: any = await res.json();
    
    console.log("SALE RECORD:");
    console.log(JSON.stringify(data[0], null, 2));
}
main();
