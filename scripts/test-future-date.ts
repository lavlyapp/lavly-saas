import { getVMPayCredentials } from '../lib/vmpay-config';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function testFutureDate() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const credentials = await getVMPayCredentials(supabaseClient);
    const joquei = credentials.find(c => c.name.toLowerCase().includes('joquei'));
    const mKey = joquei!.apiKey;

    // Simulate BRT Time vs UTC Time
    const nowBRT = new Date();
    const nowUTC = new Date(nowBRT.getTime() + 3 * 60 * 60 * 1000); // 3 hours ahead (like a UTC server sending local strings)
    
    const startDate = new Date(nowBRT.getTime() - 24 * 60 * 60 * 1000);
    
    const startStr = startDate.toISOString().replace('Z', '');
    const endStrBRT = nowBRT.toISOString().replace('Z', '');
    const endStrUTC = nowUTC.toISOString().replace('Z', '');

    console.log(`Testing with DataTermino = ${endStrBRT} (Now)`);
    let url = `https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas?dataInicio=${startStr}&dataTermino=${endStrBRT}&somenteSucesso=true&pagina=0&quantidade=2`;
    let res = await fetch(url, { headers: { 'x-api-key': mKey }});
    console.log("Status BRT:", res.status);

    console.log(`Testing with DataTermino = ${endStrUTC} (+3 Hours Future)`);
    url = `https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas?dataInicio=${startStr}&dataTermino=${endStrUTC}&somenteSucesso=true&pagina=0&quantidade=2`;
    res = await fetch(url, { headers: { 'x-api-key': mKey }});
    console.log("Status UTC (+3h):", res.status);
    
    if (res.status === 500) {
        console.log("CONFIRMED: VMPay API crashes when dataTermino is in the future!");
    }
}
testFutureDate();
