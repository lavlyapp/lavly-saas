import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { startOfDay, endOfDay } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching orders for Santos Dumont Today...");

    // Today in BRT
    const now = new Date();
    const start = startOfDay(now);
    const end = endOfDay(now);

    console.log(`UI Window: ${start.toISOString()} to ${end.toISOString()}`);
    console.log(`Current Time: ${now.toISOString()}`);

    // Fetch directly what UI fetches
    const { data: orders, error: E2 } = await supabase
        .from('orders')
        .select('*')
        .ilike('loja', '%Santos Dumont%')
        .gte('data', start.toISOString())
        .lte('data', end.toISOString())
        .order('data', { ascending: false });

    console.log(`Santos Dumont Orders today (descending): ${orders?.length || 0}`);

    if (orders) {
        orders.slice(0, 15).forEach(o => {
            console.log(`\nOrder: ID=${o.id} | SaleID=${o.sale_id} | Machine="${o.machine}"`);
            console.log(`   Data (DB): ${o.data}`);
            console.log(`   Product: ${o.produto} | Service: ${o.service}`);

            const dbDate = new Date(o.data);
            const diffMin = (now.getTime() - dbDate.getTime()) / (1000 * 60);
            console.log(`   -> Started ${Math.round(diffMin)} minutes ago`);
        });
    }
}
main();
