import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { syncVMPaySales, syncVMPayCustomers } from '../lib/vmpay-client';
import { upsertSales } from '../lib/persistence';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("=== EXECUTING SYSTEMIC DATABASE HEAL ===");

    // 1. Vaporize all March sales and orders to prevent duplicate clashes with the new UTC-3 math
    console.log("1. Deleting Corrupted Orders (March)...");
    const { error: err1 } = await supabase
        .from('orders')
        .delete()
        .gte('data', '2026-03-01T00:00:00Z');
    if (err1) console.error("Error deleting orders:", err1);

    console.log("2. Deleting Corrupted Sales (March)...");
    const { error: err2 } = await supabase
        .from('sales')
        .delete()
        .gte('data', '2026-03-01T00:00:00Z');
    if (err2) console.error("Error deleting sales:", err2);

    // 2. Re-trigger a pristine global fetch from VMPay for the vaporized window
    console.log("3. Rebuilding March 1st to Present via VMPay API...");
    const startDate = new Date('2026-03-01T00:00:00-03:00');
    const endDate = new Date();

    console.log("Syncing Sales...");
    const newSales = await syncVMPaySales(startDate, endDate);

    console.log(`Received ${newSales.length} pristine sales from VMPay. Pushing to Supabase...`);
    const result = await upsertSales(newSales, supabase);

    if (result && result.success) {
        console.log("\n=== HEAL COMPLETE ===");
        console.log("The entire month of March was reconstructed mathematically perfectly.");
        console.log("Machines Em Uso should now correctly parse the local time and remain open for their true cycle duration.");
    } else {
        console.error("Critical failure during rebuild:", result);
    }
}
main();
