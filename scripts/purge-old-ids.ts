import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
    console.log("Fetching all sales without hyphen in ID...");

    let deletedCount = 0;
    let hasMore = true;

    while (hasMore) {
        // Sales that do NOT contain a hyphen are the old format since the new one is CNPJ-SALEID
        const { data: oldSales, error } = await supabase
            .from('sales')
            .select('id')
            .not('id', 'like', '%-%')
            .limit(1000);

        if (error) {
            console.error("Error fetching old sales:", error);
            return;
        }

        if (oldSales && oldSales.length > 0) {
            console.log(`Found ${oldSales.length} old format sales in this batch.`);

            const chunk = oldSales.map(s => s.id);

            console.log(`Deleting orders for ${chunk.length} sales...`);
            const { error: errOrders } = await supabase
                .from('orders')
                .delete()
                .in('sale_id', chunk);

            if (errOrders) console.error("Order delete error:", errOrders.message);

            console.log(`Deleting ${chunk.length} sales...`);
            const { error: errSales } = await supabase
                .from('sales')
                .delete()
                .in('id', chunk);

            if (errSales) {
                console.error("Sale delete error:", errSales.message);
                break; // Prevent infinite loop on failure
            }

            deletedCount += chunk.length;
        } else {
            console.log("No more old format IDs found. Done.");
            hasMore = false;
        }
    }
    console.log(`Successfully purged ${deletedCount} legacy records.`);
}

run();
