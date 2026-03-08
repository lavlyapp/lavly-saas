import fetch from 'node-fetch';

const apiKey = 'ec80bbafea4fec261ed07613589b259d.d1a017ad62d2dbe527aebdceef3e1640aeb700c8b6d859a0f023ea0224dcaedc.70f69a5db7fbb3fedcd4b9eeb2cefd16d1ff8f82875cae6f54db149c4031d275';
const VMPAY_API_BASE_URL = "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";
const url = `${VMPAY_API_BASE_URL}/vendas?dataInicio=2026-03-08T00:00:00&dataTermino=2026-03-08T23:59:59&somenteSucesso=true&pagina=0&quantidade=100`;

async function run() {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'x-api-key': apiKey }
        });

        if (!response.ok) {
            console.error('Error fetching API:', response.status, await response.text());
            return;
        }

        const data = await response.json();
        console.log('Result count for Cascavel today:', data.length);

        let totalValor = 0;
        data.forEach(d => {
            totalValor += Number(d.valor || 0);
        });

        console.log('Total Valor API VMPay:', totalValor);

        if (data.length > 0) {
            console.log('First sale time (idx 0):', data[0].data);
            console.log('Last sale time (idx n-1):', data[data.length - 1].data);
        }
    } catch (e) {
        console.error(e);
    }
}
run();
