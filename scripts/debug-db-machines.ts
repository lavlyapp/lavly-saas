import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const { data, error } = await supabase
        .from('orders')
        .select('loja, machine')
        .eq('loja', 'Lavateria Cascavel')
        .order('data', { ascending: false })
        .limit(100);

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    const uniqueMachines = new Set(data.map(d => d.machine));
    console.log(`Unique machines in DB for Lavateria Cascavel:`);
    console.log(Array.from(uniqueMachines).join(', '));
}

main();
