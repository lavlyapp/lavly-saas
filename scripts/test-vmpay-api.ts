import { getVMPayCredentials } from '../lib/vmpay-config';

async function testVMPay() {
    const creds = await getVMPayCredentials();
    const cred = creds.find(c => c.name.toLowerCase().includes('joquei'));
    if (!cred) return;

    const baseData = {
        cnpj_empresa: cred.cnpj,
        "x-api-key": cred.apiKey
    };

    // Let's test what VMPay returns when we pass different date formats
    const queries = [
        { name: "With Z (UTC)", start: "2026-03-13T03:00:00.000Z", end: "2026-03-14T02:59:59.000Z" },
        { name: "Without Z (Assumed BRT)", start: "2026-03-13T00:00:00", end: "2026-03-13T23:59:59" }
    ];

    for (const q of queries) {
        console.log(`\nTesting: ${q.name}`);
        const url = `https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas?dataInicio=${q.start}&dataTermino=${q.end}&somenteSucesso=true&pagina=0&quantidade=5`;
        const res = await fetch(url, {
            method: "GET",
            headers: { "x-api-key": cred.apiKey }
        });
        
        if (res.ok) {
            const data = await res.json();
            console.log(`Success! Array Length: ${Array.isArray(data) ? data.length : 'not an array'}`);
            if (Array.isArray(data) && data.length > 0) {
                console.log(`First Sale Date: ${data[0].data}`);
                console.log(`Last Sale Date:  ${data[data.length - 1].data}`);
            }
        } else {
            console.log(`Failed: ${res.status}`);
        }
    }
}
testVMPay();
