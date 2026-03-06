import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getVMPayCredentials } from '../lib/vmpay-config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching orders for Cascavel (March 1 to March 6)...");

    const startDate = '2026-03-01T00:00:00Z';
    const endDate = '2026-03-06T23:59:59Z';

    const { data: sales, error: salesErr } = await supabase
        .from('sales')
        .select('id, data, valor')
        .ilike('loja', '%CASCAVEL%')
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: false });

    console.log(`Total Sales (Transacoes): ${sales?.length}`);

    const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, sale_id, data, machine, service')
        .ilike('loja', '%CASCAVEL%')
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: false });

    console.log(`Total Orders (Cestos): ${orders?.length}`);

    if (orders && orders.length > 0) {
        console.log("Sample 5 orders:", orders.slice(0, 5));
    }
}

run();
