import { getVMPayCredentials } from '../lib/vmpay-config';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function testUserAgentBan() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const credentials = await getVMPayCredentials(supabaseClient);
    const joquei = credentials.find(c => c.name.toLowerCase().includes('joquei'));
    const mKey = joquei!.apiKey;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 1 dia
    
    const startStr = startDate.toISOString().replace('Z', '');
    const endStr = endDate.toISOString().replace('Z', '');
    const url = `https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=2`;

    console.log("Testing with Vercel Default fetch User-Agent...");
    let res = await fetch(url, { headers: { 'x-api-key': mKey, 'user-agent': 'node-fetch/1.0' }});
    console.log("Status with node-fetch:", res.status);

    console.log("Testing with curl User-Agent...");
    res = await fetch(url, { headers: { 'x-api-key': mKey, 'user-agent': 'curl/7.81.0' }});
    console.log("Status with curl:", res.status);
    
    console.log("Testing with Empty User-Agent...");
    res = await fetch(url, { headers: { 'x-api-key': mKey, 'user-agent': '' }});
    console.log("Status with empty:", res.status);

    console.log("Testing with Chrome User-Agent...");
    res = await fetch(url, { headers: { 'x-api-key': mKey, 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }});
    console.log("Status with Chrome:", res.status);
}
testUserAgentBan();
