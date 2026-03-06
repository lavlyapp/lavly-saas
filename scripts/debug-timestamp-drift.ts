import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching paired records for Cascavel...");

    // The exact Sale ID from our late-night anomaly
    const testSaleId = "43660010000166-29569419";

    const { data: sales, error: e1 } = await supabase
        .from('sales')
        .select('*')
        .eq('id', testSaleId);

    const { data: orders, error: e2 } = await supabase
        .from('orders')
        .select('*')
        .eq('sale_id', testSaleId);

    if (sales && sales.length > 0) {
        console.log(`[SALES TABLE] Data: ${sales[0].data}`);
    }
    if (orders && orders.length > 0) {
        orders.forEach(o => {
            console.log(`[ORDERS TABLE] Data: ${o.data} | Machine: ${o.machine}`);
        });
    }
}
main();
