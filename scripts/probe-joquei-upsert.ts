import { syncVMPaySales } from '../lib/vmpay-client';
import { getVMPayCredentials } from '../lib/vmpay-config';
import { upsertSales } from '../lib/persistence';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Notice that the SERVICE_ROLE_KEY is used here to bypass RLS locally and identify if it's an RLS issue or Data Issue
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testUpsertJoquei() {
    console.log("Starting full DB upsert test for Jóquei...");

    const creds = await getVMPayCredentials();
    const joqueiCred = creds.find(c => c.name.includes("JOQUEI"));

    if (!joqueiCred) return;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 2); // just 2 days to test DB insertion

    const sales = await syncVMPaySales(startDate, endDate, joqueiCred);
    console.log(`Fetched ${sales.length} sales. Attempting to save...`);

    const result = await upsertSales(sales, supabaseAdmin);

    console.log("Upsert Result:", result);
}

testUpsertJoquei();
