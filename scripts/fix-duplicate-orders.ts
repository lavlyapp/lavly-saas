import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Fetching today's orders to find duplicates created by the +3hr timezone offset test...");
    
    // Narrow query down to TODAY so we don't hit the 1000 row Supabase limit
    const startStr = "2026-03-22T00:00:00-03:00"; 
    
    const { data: orders, error } = await supabase
        .from('orders')
        .select('id, sale_id, machine, created_at, data, loja')
        .gte('data', startStr)
        .limit(5000); // increase limit just in case

    if (error) {
        console.error("Failed to fetch orders:", error);
        return;
    }

    console.log(`Found ${orders.length} recent orders.`);

    // Group by sale_id + machine
    const grouped = new Map<string, any[]>();
    for (const o of orders) {
        const key = `${o.sale_id}-${o.machine}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(o);
    }

    const toDelete: string[] = [];
    let fixCount = 0;

    for (const [key, group] of grouped.entries()) {
        if (group.length > 1) {
            // Sort by created_at. The LAST one inserted (newest created_at) is the one from the final correct "Sync VMPay" the user just did!
            // Wait, the newest one is the CORRECT one because I just pushed the fix to Vercel and the user clicked Sync!
            // So we want to KEEP the newest one, and DELETE the older mutant clones!
            group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            console.log(`Duplicate found for Sale: ${key}. Keeping newest (${group[0].created_at}), deleting ${group.length - 1} older clones.`);
            
            // Keep the FIRST one (newest), delete the rest
            for (let i = 1; i < group.length; i++) {
                toDelete.push(group[i].id);
            }
            fixCount++;
        }
    }

    console.log(`Found ${fixCount} sales with duplicate baskets. Total duplicate records to delete: ${toDelete.length}`);

    if (toDelete.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < toDelete.length; i += batchSize) {
            const batch = toDelete.slice(i, i + batchSize);
            const { error: delErr } = await supabase
                .from('orders')
                .delete()
                .in('id', batch);
            
            if (delErr) {
                console.error("Error deleting batch:", delErr);
            } else {
                console.log(`Deleted batch of ${batch.length} phantom records.`);
            }
        }
    }

    console.log("Cleanup complete!");
}

main();
