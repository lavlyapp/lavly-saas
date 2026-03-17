import { getVMPayCredentials } from '../lib/vmpay-config';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function checkLiveDebug() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const credentials = await getVMPayCredentials(supabaseClient);
    const joquei = credentials.find(c => c.name.toLowerCase().includes('joquei'));

    if (!joquei) {
        console.error("Joquei credentials not found.");
        return;
    }

    const mKey = joquei.apiKey;
    console.log("Found key starting with:", mKey.substring(0, 5));

    const debugUrl = `https://www.lavly.com.br/api/debug-vmpay?key=${encodeURIComponent(mKey)}`;
    
    console.log("Let's ping Vercel Debug API every 10s until it's online:");

    for (let i = 0; i < 15; i++) {
        try {
            const res = await fetch(debugUrl);
            const data = await res.json();
            
            if (res.status === 404) {
               console.log("Deployment not ready yet...");
            } else {
               console.log("Vercel Result:", JSON.stringify(data, null, 2));
               break;
            }
        } catch(e: any) {
            console.error("Error pinging:", e.message);
        }
        await new Promise(r => setTimeout(r, 10000));
    }
}
checkLiveDebug();
