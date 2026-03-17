const urlBase = "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";
const apiKey = "e86895c1-eeb7-4ebc-b3a6-5faac6b940e4"; // cascavel test
const startDate = "2026-03-14T00:00:00";
const endDate = "2026-03-14T23:59:59";

const endpoints = [
    "/ciclos",
    "/acionamentos",
    "/operacoes",
    "/maquinas/ciclos",
    "/transacoes",
    "/vendas/ciclos"
];

async function testEndpoints() {
    console.log("Fuzzing VMPay External API Endpoints...");
    
    for (const ep of endpoints) {
        const url = `${urlBase}${ep}?dataInicio=${startDate}&dataTermino=${endDate}`;
        try {
            const r = await fetch(url, { headers: { 'x-api-key': apiKey } });
            console.log(`[${r.status}] ${ep}`);
            if (r.status === 200 || r.status === 500) {
                const text = await r.text();
                console.log(` ---> response data preview: ${text.substring(0, 100)}`);
            }
        } catch (e) {
            console.log(`[ERROR] ${ep}: ${e.message}`);
        }
    }
}

testEndpoints();
