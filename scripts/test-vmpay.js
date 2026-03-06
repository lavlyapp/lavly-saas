import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We extract parsing of the env var simulating what vmpay-config does
const storesEnv = process.env.VMPAY_STORES || '';
const stores = storesEnv.split(';').filter(Boolean).map(s => {
    const [name, apiKey, cnpj] = s.split('|');
    return { name, apiKey, cnpj };
});

if (stores.length === 0) {
    console.log("No stores configured in VMPAY_STORES");
    process.exit(1);
}

const cred = stores[0];
console.log(`Testing with store: ${cred.name}`);

const url = `https://api.vmpay.com.br/v2/clientes?pagina=0&quantidade=20`;

async function run() {
    const res = await fetch(url, {
        headers: { 'x-api-key': cred.apiKey }
    });

    if (!res.ok) {
        console.log("Error:", res.status, await res.text());
        return;
    }

    const data = await res.json();
    console.log("Raw Response Array Length:", data.length);
    if (data.length > 0) {
        // Find one with gender/sexo
        let found = data.find(c => c.genero || c.sexo);
        if (!found) found = data[0];

        console.log("Sample Customer Object:", JSON.stringify(found, null, 2));
    }
}

run();
