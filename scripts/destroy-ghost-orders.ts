import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Locating Timezone Ghost Orders...");

    // First, fetch all recent orders from Cascavel
    const { data: orders, error: E1 } = await supabase
        .from('orders')
        .select('id, sale_id, data, machine')
        .ilike('loja', '%Cascavel%')
        .gte('data', '2026-03-01T00:00:00Z');

    if (orders) {
        // Collect all distinct sale_ids
        const saleIds = Array.from(new Set(orders.map(o => o.sale_id)));

        // Fetch the corresponding parent sales
        const { data: sales, error: E2 } = await supabase
            .from('sales')
            .select('id, data')
            .in('id', saleIds);

        if (sales) {
            const saleDateMap = new Map();
            sales.forEach(s => saleDateMap.set(s.id, s.data));

            let ghostCount = 0;
            const ghostIds: string[] = [];

            orders.forEach(o => {
                const parentDate = saleDateMap.get(o.sale_id);
                if (parentDate && parentDate !== o.data) {
                    ghostCount++;
                    ghostIds.push(o.id);
                    console.log(`GHOST DETECTED: Order ID ${o.id} | Machine ${o.machine}`);
                    console.log(`   -> Order Time : ${o.data}`);
                    console.log(`   -> Parent Time: ${parentDate}`);
                }
            });

            console.log(`\nTotal Ghosts Found in March: ${ghostCount}`);

            // Optionally, delete them right now if it's safe
            if (ghostIds.length > 0) {
                console.log(`Deleting ${ghostIds.length} ghost mutations to restore math integrity...`);
                // Splitting into chunks of 100 for supabase
                for (let i = 0; i < ghostIds.length; i += 100) {
                    const chunk = ghostIds.slice(i, i + 100);
                    const { error: deletionError } = await supabase
                        .from('orders')
                        .delete()
                        .in('id', chunk);
                    if (deletionError) console.error("Deletion failed:", deletionError);
                }
                console.log("Cleanup Complete! The Cestos will now mathematically lock to 8.");
            }
        }
    }
}
main();
