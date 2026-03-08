const fetch = require('node-fetch');

const urls = [
    { name: 'Cascavel', key: 'e8689749-58b1-4a3e-8f1c-11d1a5e2b42e' },
    { name: 'JOQUEI', key: 'cc9c772c-ad36-43a6-a3af-582da70feb07' }
];

async function run() {
    for (const store of urls) {
        const url = `https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas?dataInicio=2026-03-08T00:00:00&dataTermino=2026-03-08T23:59:59&somenteSucesso=true&pagina=0&quantidade=100`;
        try {
            const res = await fetch(url, { headers: { 'x-api-key': store.key } });
            const data = await res.json();
            console.log(`\n--- ${store.name} ---`);
            console.log('Count:', data.length);
            let total = 0;
            data.forEach(d => total += d.valor);
            console.log('Total:', total);
            if (data.length > 0) {
                console.log('Raw Data Examples:', data.slice(0, 3).map(d => d.data));
                console.log('Raw Data Ending:', data[data.length - 1].data);
            }
        } catch (e) {
            console.error(e);
        }
    }
}
run();
