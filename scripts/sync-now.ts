import { syncVMPaySales } from './lib/vmpay-client';
import { getVMPayCredentials } from './lib/vmpay-config';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("Starting forced sync...");
    try {
        const creds = await getVMPayCredentials(supabase);
        console.log(`Found ${creds.length} credentials.`);
        const result = await syncVMPaySales(creds, 30, supabase); // 30 days
        console.log("Sync finished!", result);
    } catch (e) {
        console.error("Sync failed:", e);
    }
}

main();
