import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getVMPayCredentials } from '../lib/vmpay-config';

async function test() {
    const creds = await getVMPayCredentials();
    const cred = creds.find(c => c.name.toLowerCase().includes('cascavel'));
    if (!cred) throw new Error("No cascavel cred");

    // Let's query from "today 00:00:00" to "today 23:59:59" USING BRT strings
    const url1 = `https://app.vmpay.com.br/api/vendas?dataInicio=2026-03-06T00:00:00&dataTermino=2026-03-06T23:59:59&somenteSucesso=true&pagina=0&quantidade=100`;

    // Let's query from "today 14:00:00" to "today 23:59:59" USING UTC strings
    // If the time is currently 12:51 BRT, 14:00 is IN THE FUTURE.
    const url2 = `https://app.vmpay.com.br/api/vendas?dataInicio=2026-03-06T14:00:00&dataTermino=2026-03-06T23:59:59&somenteSucesso=true&pagina=0&quantidade=100`;

    console.log("Fetching BRT URL (00:00 to 23:59)...");
    const r1 = await fetch(url1, { headers: { 'x-api-key': cred.apiKey } });
    const data1 = await r1.json();
    console.log(`URL1 found: ${data1.length} sales. Last sale data string: ${data1.length > 0 ? data1[0].data : 'none'}`);

    console.log("Fetching UTC URL (14:00 to 23:59)...");
    const r2 = await fetch(url2, { headers: { 'x-api-key': cred.apiKey } });
    const data2 = await r2.json();
    console.log(`URL2 found: ${data2.length} sales.`);
}

test();
