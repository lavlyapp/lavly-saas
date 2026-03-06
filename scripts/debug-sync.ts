import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { VMPAY_API_BASE_URL, getVMPayCredentials } from "../lib/vmpay-config";

async function run() {
    const creds = await getVMPayCredentials();
    const cred = creds[0];

    // 1. Fetch exactly right now (UTC string)
    let now = new Date();
    let then = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago

    // Query using native toISOString
    let startStr = then.toISOString();
    let endStr = now.toISOString();
    console.log(`[TEST 1] Querying with UTC ISO Strings: ${startStr} to ${endStr}`);

    let res = await fetch(`${VMPAY_API_BASE_URL}/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=5`, {
        headers: { 'x-api-key': cred.apiKey }
    });

    let data = await res.json();
    console.log(`[TEST 1] Found ${data.length} sales`);

    // 2. Fetch using BRT Strings 
    // Manual offset for -03:00 to simulate local clock on a string
    const offsetThen = new Date(then.getTime() - 3 * 60 * 60 * 1000);
    const offsetNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    // Strip the Z to force local interpretation
    startStr = offsetThen.toISOString().replace('Z', '');
    endStr = offsetNow.toISOString().replace('Z', '');

    console.log(`[TEST 2] Querying with Local Adjusted Strings: ${startStr} to ${endStr}`);
    res = await fetch(`${VMPAY_API_BASE_URL}/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=5`, {
        headers: { 'x-api-key': cred.apiKey }
    });

    data = await res.json();
    console.log(`[TEST 2] Found ${data.length} sales`);

    if (data.length > 0) {
        console.log(`First sale date from VMPay Test 2:`, data[0].data);
    }
}

run();
