import { getVMPayCredentials, VMPAY_API_BASE_URL } from '../lib/vmpay-config';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testVMPay() {
    const creds = await getVMPayCredentials(supabase);
    if (!creds || creds.length === 0) {
        console.log("No credentials found");
        return;
    }
    const cred = creds[0];
    console.log(`Testing store: ${cred.name}`);
    
    // Testing today
    const startStr = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const endStr = new Date().toISOString();
    
    const url = `${VMPAY_API_BASE_URL}/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=100`;
    console.log(`Fetching: ${url}`);
    
    try {
        const res = await fetch(url, { headers: { 'x-api-key': cred.apiKey } });
        console.log(`Status: ${res.status} ${res.statusText}`);
        if (!res.ok) {
            console.log("Body:", await res.text());
        } else {
            const data = await res.json();
            console.log(`Success! Received ${data.length} records.`);
        }
    } catch(e) {
        console.error(e);
    }
}

testVMPay();
