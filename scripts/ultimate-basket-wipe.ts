import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const startStr = "2026-03-20T00:00:00-03:00"; 
    
    // Fetch EVERYTHING from recent days using while loop to bypass ANY 1000/5000 limit
    console.log("Fetching ALL recent orders to purge remaining ghosts...");
    let allOrders: any[] = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase
            .from('orders')
            .select('id, sale_id, machine, created_at, data, loja')
            .gte('data', startStr)
            .range(page * 1000, (page + 1) * 1000 - 1);
            
        if (error) { console.error(error); return; }
        if (!data || data.length === 0) break;
        
        allOrders = allOrders.concat(data);
        page++;
    }

    console.log(`Successfully fetched ${allOrders.length} recent orders.`);

    // Group EVERYTHING
    const grouped = new Map<string, any[]>();
    for (const o of allOrders) {
        const key = `${o.sale_id}-${o.machine}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(o);
    }

    let fixCount = 0;
    for (const [key, group] of grouped.entries()) {
        if (group.length > 1) {
            // Sort by created_at. Keep the NEWEST one.
            group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            for (let i = 1; i < group.length; i++) {
                const idToKill = group[i].id;
                console.log(`Killing Ghost ID ${idToKill} for Sale ${key}`);
                
                // Kill individually to guarantee no batch silently fails
                const { error: delErr } = await supabase
                    .from('orders')
                    .delete()
                    .eq('id', idToKill);
                    
                if (delErr) console.error("FAILED TO KILL:", delErr);
                else fixCount++;
            }
        }
    }

    console.log(`\nUltimate Cleanup Complete! Purged ${fixCount} stranded ghosts.`);
}

main();
