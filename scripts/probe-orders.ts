import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
    const { data: orders, error: ordersErr } = await supabase.from('orders').select('*').limit(5);
    console.log("Orders error:", ordersErr);
    console.log("Orders sample:", orders);

    const { data: sales, error: salesErr } = await supabase.from('sales').select('*').limit(5);
    console.log("Sales sample:", sales);
}

checkOrders();
