import { config } from 'dotenv';
config({ path: '.env.local' });

async function probeApi() {
    const apiKey = '5C1E7A03-12BC-4874-9BE0-DC9DD9CCEF5D'; // Lavateria Jóquei API Key from config
    const url = 'https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/clientes?pagina=0&quantidade=5';

    console.log(`Fetching from ${url}...`);
    const res = await fetch(url, {
        headers: { 'x-api-key': apiKey }
    });

    if (!res.ok) {
        console.error('Failed to fetch:', res.status, await res.text());
        return;
    }

    const data = await res.json();
    console.log('Sample Data:', JSON.stringify(data[0], null, 2));
}

probeApi();
