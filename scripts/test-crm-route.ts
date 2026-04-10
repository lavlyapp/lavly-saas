import fetch from 'node-fetch';

async function run() {
    try {
        const r = await fetch('https://www.teste.lavly.com.br/api/metrics/crm?store=Todas');
        const data = await r.json();
        console.log("Status:", r.status);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Fetch failed", e);
    }
}
run();
