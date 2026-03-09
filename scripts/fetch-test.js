const fetch = require('node-fetch');

const stores = [
    { name: 'Cascavel', api: 'e8689749-58b1-4a3e-8f1c-11d1a5e2b42e' },
    { name: 'SANTOS DUMONT', api: '2bfcb6f6-144b-46c1-8fc3-cef8fbf41729' },
    { name: 'JOSE WALTER', api: 'a2862031-5a98-4eb2-8b0a-e7b8cc195263' },
    { name: 'SHOPPING', api: 'f08c45c8-126a-4cb4-ab5d-5c8805c8130f' },
    { name: 'SOLARES', api: '68360f6d-fbec-4991-bd2e-c6ff89201e40' },
    { name: 'JOQUEI', api: 'cc9c772c-ad36-43a6-a3af-582da70feb07' }
];

const toLocalVMPayDateString = (date) => date.toISOString().replace('Z', '');

const f = async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 10 * 24 * 3600 * 1000);
    const startStr = toLocalVMPayDateString(past);
    const endStr = toLocalVMPayDateString(now);

    for (const s of stores) {
        console.log(`Testing ${s.name}...`);
        const url = `https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=1000`;

        const r = await fetch(url, { headers: { 'x-api-key': s.api } });
        console.log(`  -> Status: ${r.status}`);
        if (r.status === 200) {
            const data = await r.json();
            console.log(`  -> Sales: ${data.length || 0}`);
            if (data.length > 0) {
                console.log('  -> Latest:', data[data.length - 1].data || data[0].data);
            }
        } else {
            try {
                const text = await r.text();
                console.log(`  -> Error: ${text}`);
            } catch (e) { }
        }
    }
};
f().catch(console.error);
