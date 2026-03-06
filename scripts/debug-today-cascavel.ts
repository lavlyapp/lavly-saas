import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { startOfDay, endOfDay } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching sales for Cascavel Today...");

    // Today in BRT
    const now = new Date();
    const start = startOfDay(now);
    const end = endOfDay(now);

    console.log(`UI Window: ${start.toISOString()} to ${end.toISOString()}`);

    const { data: sales, error: E1 } = await supabase
        .from('sales')
        .select('*')
        .ilike('loja', '%Cascavel%')
        .gte('data', start.toISOString())
        .lte('data', end.toISOString());

    const { data: orders, error: E2 } = await supabase
        .from('orders')
        .select('*')
        .ilike('loja', '%Cascavel%')
        .gte('data', start.toISOString())
        .lte('data', end.toISOString());

    console.log(`Sales today: ${sales?.length}`);
    console.log(`Orders today: ${orders?.length}`);

    if (orders) {
        orders.forEach(o => {
            console.log(`Order: ID=${o.id} SaleID=${o.sale_id} Machine=${o.machine} Data=${o.data} Product=${o.produto}`);
        });

        const uniqueKeys = new Set<string>();
        let w = 0; let d = 0;

        orders.forEach(o => {
            const safeKey = `${o.sale_id}-${o.machine}`;
            if (uniqueKeys.has(safeKey)) {
                console.log(`[DUPLICATE BLOCKED] ${safeKey} (ID: ${o.id})`);
                return;
            }
            uniqueKeys.add(safeKey);

            const machine = (o.machine || '').toLowerCase();
            const service = (o.produto || o.service || '').toLowerCase();

            let isWash = false; let isDry = false;
            if (machine.includes('secadora') || machine.includes('secar')) {
                isDry = true;
            } else if (machine.includes('lavadora') || machine.includes('lavar')) {
                isWash = true;
            }
            if (!isWash && !isDry) {
                if (service.includes('lavagem') || service.includes('lavar')) isWash = true;
                else if (service.includes('secagem') || service.includes('secar')) isDry = true;
            }
            if (!isWash && !isDry) {
                const match = machine.match(/\d+/);
                if (match) {
                    const num = parseInt(match[0], 10);
                    if (num % 2 === 0) isWash = true;
                    else isDry = true;
                }
            }

            if (isWash) w++;
            else if (isDry) d++;
        });

        console.log(`Algorithm Count -> Washes: ${w}, Dryers: ${d}, Total: ${w + d}`);
    }
}
main();
