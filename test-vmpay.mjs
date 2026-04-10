import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// simple dotenv parser
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const [key, ...vals] = line.split('=');
    if(key) acc[key.trim()] = vals.join('=').trim().replace(/^['"]|['"]$/g, '');
    return acc;
}, {});

const VMPAY_API_BASE_URL = env.NEXT_PUBLIC_VMPAY_API_BASE_URL || "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";

async function test() {
    const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: creds } = await sb.from('stores').select('api_key, name');
    if(!creds || creds.length === 0) { console.log("No creds found"); return; }
    const apiKey = creds[0].api_key;
    console.log("Store:", creds[0].name);

    const end = new Date();
    const start = new Date(end.getTime() - 72 * 60 * 60 * 1000); // last 72 hours
    const url = `${VMPAY_API_BASE_URL}/vendas?dataInicio=2026-04-09T00:00:00Z&dataTermino=2026-04-09T23:59:59Z&somenteSucesso=true&pagina=0&quantidade=10`;
    console.log("Fetching URL:", url);

    const res = await fetch(url, { headers: { 'x-api-key': apiKey } });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    try {
        const data = JSON.parse(text);
        console.log(`Returned ${Array.isArray(data) ? data.length : 'non-array'} machines.`);
    } catch(e) {
        console.log("Text response:", text.substring(0, 200));
    }
}
test();
