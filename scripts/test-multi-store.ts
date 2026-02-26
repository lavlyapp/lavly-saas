import { VMPAY_API_BASE_URL, STATIC_VMPAY_CREDENTIALS } from "../lib/vmpay-config";

async function testMultiStoreFetch() {
    const cred = STATIC_VMPAY_CREDENTIALS[0];
    console.log(`Testing multi-store fetch using API Key: ${cred.apiKey}...`);

    const now = new Date();
    const startDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days
    const startStr = startDate.toISOString();
    const endStr = now.toISOString();

    const url = `${VMPAY_API_BASE_URL}/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=100`;

    try {
        const res = await fetch(url, {
            headers: { 'x-api-key': cred.apiKey }
        });

        if (res.ok) {
            const data = await res.json();
            const stores = new Set(data.map((r: any) => r.lavanderia));
            console.log(`Received ${data.length} records.`);
            console.log(`Unique stores found: ${Array.from(stores).join(', ')}`);

            if (data.length > 0) {
                console.log("Sample record (first store):", data[0].lavanderia);
            }
        } else {
            console.log("Error body:", await res.text());
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

testMultiStoreFetch();
