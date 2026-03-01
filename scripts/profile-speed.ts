import { VMPAY_API_BASE_URL, STATIC_VMPAY_CREDENTIALS } from '../lib/vmpay-config';

async function testFetch180() {
    const cred = STATIC_VMPAY_CREDENTIALS[0];
    const end = new Date();
    const start = new Date(end.getTime() - 180 * 24 * 60 * 60 * 1000); // 180 days ago

    // Just test the first 30-day chunk to see if the API rejects it quietly
    const chunkEnd = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    const startStr = start.toISOString();
    const endStr = chunkEnd.toISOString();

    console.log(`Fetching 30-day chunk from 180 days ago: ${startStr} to ${endStr}`);

    const url = `${VMPAY_API_BASE_URL}/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=1000`;

    try {
        const res = await fetch(url, { headers: { 'x-api-key': cred.apiKey } });
        console.log(`Status: ${res.status} ${res.statusText}`);

        if (!res.ok) {
            console.log(await res.text());
        } else {
            const data = await res.json();
            console.log(`Data length: ${data.length}`);
            if (data.length > 0) {
                console.log("Sample:", data[0].data);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

testFetch180();
