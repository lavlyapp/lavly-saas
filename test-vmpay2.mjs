import fetch from 'node-fetch';

const apiKey = 'ec80bbafea4fec261ed07613589b259d.d1a017ad62d2dbe527aebdceef3e1640aeb700c8b6d859a0f023ea0224dcaedc.70f69a5db7fbb3fedcd4b9eeb2cefd16d1ff8f82875cae6f54db149c4031d275';
const VMPAY_API_BASE_URL = "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";

async function testUrl(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'x-api-key': apiKey }
        });
        const text = await response.text();
        console.log("URL:", url);
        console.log("Status:", response.status);
        console.log("Response:", text.substring(0, 50));
    } catch (e) {
        console.error(e.message);
    }
}

async function run() {
    await testUrl(`${VMPAY_API_BASE_URL}/vendas?dataInicio=2026-03-08T00:00:00-03:00&dataTermino=2026-03-08T23:59:59-03:00&somenteSucesso=true&pagina=0&quantidade=10`);
    await testUrl(`${VMPAY_API_BASE_URL}/vendas?dataInicio=2026-03-08T00:00:00&dataTermino=2026-03-08T23:59:59&somenteSucesso=true&pagina=0&quantidade=10`);
    await testUrl(`${VMPAY_API_BASE_URL}/vendas?dataInicio=2026-03-08&dataTermino=2026-03-08&somenteSucesso=true&pagina=0&quantidade=10`);
}
run();
