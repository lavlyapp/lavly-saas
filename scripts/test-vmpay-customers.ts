import { getVMPayCredentials } from '../lib/vmpay-config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const VMPAY_API_BASE_URL = "https://api.vmpay.com.br/v2";

async function run() {
    const credentials = await getVMPayCredentials();
    if (credentials.length === 0) {
        console.log("No credentials found");
        return;
    }

    const cred = credentials[0]; // test with the first store
    console.log(`Testing with store: ${cred.name}`);

    const url = `${VMPAY_API_BASE_URL}/clientes?pagina=0&quantidade=5`;
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
        console.log("Sample Customer Object:", JSON.stringify(data[0], null, 2));
    }
}

run();
