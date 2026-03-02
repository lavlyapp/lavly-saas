import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStores() {
    console.log("Checking Jóquei orders in DB...");
    const { data: sales, error: sErr } = await supabase.from('sales').select('*').ilike('loja', '%JOQUEI%');
    console.log(`Sales for JOQUEI in DB: ${sales?.length}`);

    if (sales && sales.length > 0) {
        console.log("Sample JOQUEI Sale:", sales[0]);
    }

    const { data: orders, error: jErr } = await supabase.from('orders').select('*').ilike('loja', '%JOQUEI%');
    console.log(`Orders for JOQUEI in DB: ${orders?.length}`);

    if (orders && orders.length > 0) {
        console.log("Sample JOQUEI Order:", orders[0]);
    }
}

checkStores();
