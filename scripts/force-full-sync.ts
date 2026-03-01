import { createClient } from '@supabase/supabase-js';
import { syncVMPaySales } from '../lib/vmpay-client';
import { upsertSales } from '../lib/persistence';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runFullSync() {
    console.log("Starting forced full historical sync (180 days) to backfill missing orders...");
    try {
        // Fetch 180 days to cover the historical gap
        const records = await syncVMPaySales(180);
        console.log(`Fetched ${records.length} records including items. Updating DB...`);

        // This will update sales AND insert the missing orders
        const result = await upsertSales(records);

        if (result && result.success) {
            console.log("Historical sync and backfill successful!");
        } else {
            console.error("Backfill failed during DB save:", result);
        }
    } catch (err) {
        console.error("Error running script:", err);
    }
}

runFullSync();
