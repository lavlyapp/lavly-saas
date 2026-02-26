const VMPAY_API_BASE_URL = "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";
const API_KEY = "e8689749-58b1-4a3e-8f1c-11d1a5e2b42e";

async function test() {
    console.log(`Testing multi-store fetch using hardcoded API Key...`);

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const startStr = startDate.toISOString();
    const endStr = now.toISOString();

    const url = `${VMPAY_API_BASE_URL}/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=100`;

    try {
        const res = await fetch(url, {
            headers: { 'x-api-key': API_KEY }
        });

        if (res.ok) {
            const data = await res.json();
            const stores = new Set(data.map((r) => r.lavanderia));
            console.log(`Received ${data.length} records.`);
            console.log(`Unique stores found: ${Array.from(stores).join(', ')}`);
        } else {
            console.log("Error status:", res.status);
            console.log("Error body:", await res.text());
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

test();
