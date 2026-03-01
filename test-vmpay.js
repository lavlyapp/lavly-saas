const https = require('https');

async function testFetch() {
    const url = 'https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas?dataInicio=2024-02-01T00:00:00Z&dataTermino=2024-02-28T23:59:59Z&somenteSucesso=true&pagina=0&quantidade=1';

    https.get(url, { headers: { 'x-api-key': 'e8689749-58b1-4a3e-8f1c-11d1a5e2b42e' } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log(JSON.stringify(json[0], null, 2));
            } catch (e) {
                console.log("Error parsing", e.message, data.substring(0, 100));
            }
        });
    });
}
testFetch();
