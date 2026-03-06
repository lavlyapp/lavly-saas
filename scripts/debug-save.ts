import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { syncVMPaySales } from "../lib/vmpay-client";
import { upsertSales } from "../lib/persistence";
import { getVMPayCredentials } from "../lib/vmpay-config";

// Notice we only have the ANON key here, so we must disable RLS on the table to test
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
    const creds = await getVMPayCredentials();
    const cred = creds.find(c => c.name.includes("Cascavel"));

    if (!cred) return console.log("Cascavel not found");

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // just 1 day to be fast

    console.log("Fetching sales for Cascavel...");
    const sales = await syncVMPaySales(threeDaysAgo, now, cred);
    console.log(`Fetched ${sales.length} sales.`);

    if (sales.length > 0) {
        console.log("Upserting into DB...");
        const res = await upsertSales(sales, supabase);
        console.log("Persistence Result:", res);
    }
}

run();
