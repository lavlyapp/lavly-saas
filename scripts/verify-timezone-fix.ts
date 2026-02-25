
const VMPAY_API_BASE_URL = "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";
const API_KEY = "e8689749-58b1-4a3e-8f1c-11d1a5e2b42e"; // Hardcoded for test

async function run() {
    try {
        const start = "2026-02-12T00:00:00Z";
        const end = "2026-02-12T23:59:59Z";

        const url = `${VMPAY_API_BASE_URL}/vendas?dataInicio=${start}&dataTermino=${end}&quantidade=1&pagina=0&somenteSucesso=true`;
        console.log("Fetching URL:", url);

        const res = await fetch(url, {
            headers: { 'x-api-key': API_KEY }
        });

        const data = await res.json();
        if (data.length > 0) {
            let dateStr = data[0].data;
            console.log("Raw API Date:", dateStr);

            // Simulation of what vmpay-client.ts does now
            if (dateStr && !dateStr.endsWith('Z')) {
                dateStr += 'Z';
            }
            console.log("Fixed Date Str:", dateStr);

            const d = new Date(dateStr);
            console.log("Parsed Date (New Date):", d.toString());
            console.log("Parsed ISO:", d.toISOString());
            console.log("Timezone Offset:", d.getTimezoneOffset());

            // Expected: If Local is UTC-3.
            // Raw: 2026-02-12T00:35:22
            // Fixed: 2026-02-12T00:35:22Z
            // Parsed: Previous Day (Feb 11) at 21:35
        } else {
            console.log("No data found");
        }
    } catch (e) {
        console.error(e);
    }
}

run();
