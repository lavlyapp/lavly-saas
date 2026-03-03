
const https = require('https');

const stores = [
    { name: "Cascavel", key: "e8689749-58b1-4a3e-8f1c-11d1a5e2b42e" },
    { name: "Joquei", key: "cc9c772c-ad36-43a6-a3af-582da70feb07" },
    { name: "Jose Walter", key: "a2862031-5a98-4eb2-8b0a-e7b8cc195263" }
];

async function checkStore(store) {
    // Current date in UTC (VMPay API expects ISO strings or YYYY-MM-DDTHH:mm:ssZ)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const start = `${todayStr}T00:00:00Z`;
    const end = `${todayStr}T23:59:59Z`;

    const url = `https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas?dataInicio=${start}&dataTermino=${end}&somenteSucesso=true&pagina=0&quantidade=10`;

    return new Promise((resolve) => {
        https.get(url, { headers: { 'x-api-key': store.key } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`[${store.name}] Found ${Array.isArray(json) ? json.length : 0} sales today.`);
                    if (Array.isArray(json) && json.length > 0) {
                        console.log(`[${store.name}] Latest sale:`, json[0].data, "ID:", json[0].idVenda);
                    }
                    resolve();
                } catch (e) {
                    console.log(`[${store.name}] Error parsing:`, e.message);
                    resolve();
                }
            });
        }).on('error', (e) => {
            console.log(`[${store.name}] Request error:`, e.message);
            resolve();
        });
    });
}

async function run() {
    console.log("Checking sales for today (UTC range):", new Date().toISOString().split('T')[0]);
    for (const store of stores) {
        await checkStore(store);
    }
}

run();
