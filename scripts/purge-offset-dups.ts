import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
    console.log("Fetching recent orders to check for timezone offset duplicates...");

    // We fetch last 10 days because my auto-heal went back up to 10 days when force was true or sync was empty
    const start = new Date(new Date().getTime() - 15 * 24 * 60 * 60 * 1000);

    let offset = 0;
    const limit = 1000;
    let hasMore = true;
    let allOrders: any[] = [];

    while (hasMore) {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('sale_id, machine, data')
            .gte('data', start.toISOString())
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Error fetching orders:", error);
            return;
        }

        if (orders && orders.length > 0) {
            allOrders.push(...orders);
            offset += limit;
            if (orders.length < limit) hasMore = false;
        } else {
            hasMore = false;
        }
    }

    console.log(`Fetched ${allOrders.length} orders total in the last 15 days.`);

    // Group by sale_id + machine
    const groups = new Map<string, any[]>();
    allOrders.forEach(o => {
        const key = `${o.sale_id}-${o.machine}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(o);
    });

    const toDelete: { sale_id: string, machine: string, data: string }[] = [];

    for (const [key, list] of groups.entries()) {
        if (list.length > 1) {
            // Sort by data (string comparison is fine for ISO strings)
            list.sort((a, b) => a.data.localeCompare(b.data));

            // Keep the first one, delete the rest
            for (let i = 1; i < list.length; i++) {
                toDelete.push(list[i]);
            }
        }
    }

    console.log(`Found ${toDelete.length} duplicate orders (same sale_id + machine).`);

    if (toDelete.length > 0) {
        // Chunk deletions
        const batchSize = 100; // Small batch for compound deletes
        let deleted = 0;
        for (let i = 0; i < toDelete.length; i += batchSize) {
            const chunk = toDelete.slice(i, i + batchSize);

            for (const item of chunk) {
                const { error: errOrders } = await supabase
                    .from('orders')
                    .delete()
                    .match({ sale_id: item.sale_id, machine: item.machine, data: item.data });

                if (errOrders) console.error("Order delete error:", errOrders.message);
                else deleted++;
            }
            console.log(`Deleted ${deleted}/${toDelete.length} duplicates...`);
        }
        console.log(`Done cleaning up timezone offset duplicates.`);
    } else {
        console.log("No timezone offset duplicates found.");
    }
}

run();
