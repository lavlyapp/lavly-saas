import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: sales, error } = await supabase
        .from('sales')
        .select('*')
        .gte('data', '2026-03-08T00:00:00.000Z')
        .lte('data', '2026-03-08T23:59:59.999Z');

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    console.log("Sales today:", sales.length);
    if (sales.length > 0) {
        console.log("First sale:", sales[0].data);
        console.log("Last sale:", sales[sales.length - 1].data);
    }

    const { data: orders, error: oError } = await supabase
        .from('orders')
        .select('*')
        .gte('data', '2026-03-08T00:00:00.000Z')
        .lte('data', '2026-03-08T23:59:59.999Z');

    console.log("Orders today:", orders ? orders.length : 0);
    if (orders && orders.length > 0) {
        orders.forEach(o => {
            console.log(`Order ID: ${o.id}, Machine: ${o.machine}, Time: ${o.data}`);
        });
    }
}
run();
