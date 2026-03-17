import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { runGlobalSync } from '../lib/automation/sync-manager';

// Must use SERVICE ROLE to bypass RLS for debugging
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testSync() {
    console.log("Simulating Manual Sync...");
    try {
        const newSales = await runGlobalSync(true, false, supabase, "43660010000166"); // Cascavel
        console.log(`Sync complete. Returned ${newSales.length} total new sales from sync process.`);
    } catch (e) {
        console.error("Sync crashed:", e);
    }
}
testSync();
