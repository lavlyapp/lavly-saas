import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkOrders() {
    console.log("Checking orders table...");
    const { count, error } = await supabase.from('orders').select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error fetching orders:", error);
    } else {
        console.log(`Total orders in DB: ${count}`);
    }

    const { count: sCount, error: sErr } = await supabase.from('sales').select('*', { count: 'exact', head: true });
    if (sErr) {
        console.error("Error fetching sales:", sErr);
    } else {
        console.log(`Total sales in DB: ${sCount}`);
    }
}

checkOrders();
