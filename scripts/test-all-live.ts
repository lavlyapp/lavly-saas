import { getVMPayCredentials } from '../lib/vmpay-config';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function checkAllLiveDebugs() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const credentials = await getVMPayCredentials(supabaseClient);

    for (const store of credentials) {
        const mKey = store.apiKey;
        const debugUrl = `https://www.lavly.com.br/api/debug-vmpay?key=${encodeURIComponent(mKey)}`;
        
        try {
            const res = await fetch(debugUrl);
            const data = await res.json();
            console.log(`${store.name} -> Vercel API returned status:`, data.status, data.ok ? "OK" : "ERROR");
            if (!data.ok) {
                 console.log("Error details:", data.error || data.textPreview);
            }
        } catch(e: any) {
            console.error(`Failed to reach Vercel for ${store.name}`, e.message);
        }
    }
}
checkAllLiveDebugs();
