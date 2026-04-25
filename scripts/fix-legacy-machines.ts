import { getVMPayCredentials } from './lib/vmpay-config';
import { syncVMPaySales } from './lib/vmpay-client';
import { upsertSales } from './lib/persistence';
import { supabase } from './lib/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log("Starting legacy fix sync (Last 4 days)...");
    const credentials = await getVMPayCredentials();
    const groupsByApiKey = new Map<string, any[]>();
    for (const cred of credentials) {
        let arr = groupsByApiKey.get(cred.apiKey);
        if (!arr) { arr = []; groupsByApiKey.set(cred.apiKey, arr); }
        arr.push(cred);
    }
    
    const start = new Date(Date.now() - 4 * 24 * 3600 * 1000);
    const end = new Date();
    
    for (const [apiKey, groupCreds] of groupsByApiKey.entries()) {
        try {
            console.log(`Syncing ${groupCreds.length} stores on key ${apiKey.substring(0,6)}...`);
            const sales = await syncVMPaySales(start, end, groupCreds[0]);
            console.log(`Found ${sales.length} sales. Upserting to DB...`);
            if (sales.length > 0) {
                const res = await upsertSales(sales, supabase);
                console.log(`Upsert result:`, res?.success);
            }
        } catch (e) {
            console.error(e);
        }
    }
    console.log("DONE!");
}

main();
