import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const { data: orders, error } = await supabase
        .from('orders')
        .select('loja, machine')
        .eq('loja', 'Lavateria Cascavel')
        .limit(10000);

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    const uniqueMachines = new Set(orders.map(o => o.machine));
    console.log(`Unique machines in DB for Lavateria Cascavel (all history limit 10k):`);
    console.log(Array.from(uniqueMachines).join(', '));
}

main();
