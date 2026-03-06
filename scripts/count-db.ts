import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
    const { count, error } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error counting sales:", error);
        return;
    }

    console.log(`[DB] EXATAMENTE ${count} vendas reais na tabela sales do Supabase.`);

    const { count: countOrders, error: errOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

    console.log(`[DB] EXATAMENTE ${countOrders} orders reais na tabela orders do Supabase.`);
}

run();
