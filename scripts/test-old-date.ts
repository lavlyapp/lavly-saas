import { getVMPayCredentials } from '../lib/vmpay-config';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function verifyTimeoutAndOldDate() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const credentials = await getVMPayCredentials(supabaseClient);
    const joquei = credentials.find(c => c.name.toLowerCase().includes('joquei'));
    const mKey = joquei!.apiKey;

    // Test March 8th format
    const startStr = '2026-03-08T00:00:00';
    const endStr = new Date().toISOString().replace('Z', '');

    console.log(`Testing Joquei with 5-day interval (March 8)...`);
    const url = `https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=1000`;
    
    const res = await fetch(url, { headers: { 'x-api-key': mKey } });
    console.log("Status:", res.status);
    if (!res.ok) {
        console.log("Error text:", await res.text());
    }
}
verifyTimeoutAndOldDate();
