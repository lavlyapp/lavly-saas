import { VMPAY_API_BASE_URL, STATIC_VMPAY_CREDENTIALS } from '../lib/vmpay-config';

async function testFetch() {
    const cred = STATIC_VMPAY_CREDENTIALS[0];
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000); // 1 day ago

    const startStr = start.toISOString();
    const endStr = end.toISOString();

    console.time("Fetch Machines");
    const mRes = await fetch(`${VMPAY_API_BASE_URL}/maquinas?pagina=0&quantidade=1000`, {
        headers: { 'x-api-key': cred.apiKey }
    });
    console.timeEnd("Fetch Machines");
    const ms = await mRes.json();
    console.log(`Machines: ${ms.length}`);

    console.time("Fetch Sales 1 Day");
    const url = `${VMPAY_API_BASE_URL}/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=1000`;
    const res = await fetch(url, { headers: { 'x-api-key': cred.apiKey } });
    console.timeEnd("Fetch Sales 1 Day");
    const data = await res.json();
    console.log(`Sales in last 24h: ${data.length}`);
}

testFetch();
