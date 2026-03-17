import { syncVMPaySales } from '../lib/vmpay-client';
import { getVMPayCredentials } from '../lib/vmpay-config';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testFetchWithNewTimezone() {
    const credentials = await getVMPayCredentials(supabase);
    const joquei = credentials.find(c => c.name.toLowerCase().includes('joquei'));
    
    // Simulate what sync-manager sends for a manual sync: now and 3 days ago.
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    console.log(`[TEST] Testing syncVMPaySales for ${joquei!.name}`);
    console.log(`Start Date (Raw): ${threeDaysAgo.toISOString()}`);
    console.log(`End Date (Raw): ${now.toISOString()}`);
    
    try {
        const sales = await syncVMPaySales(threeDaysAgo, now, joquei!);
        console.log(`\nReturned Sales Count: ${sales.length}`);
        if(sales.length > 0) {
            console.log(`First Sale: ${sales[0].data}`);
            console.log(`Last Sale: ${sales[sales.length-1].data}`);
        }
    } catch (e: any) {
        console.error("Failed:", e);
    }
}
testFetchWithNewTimezone();
