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
        .eq('machine', '500')
        .order('data', { ascending: false })
        .limit(10);

    if (error) {
        console.error("error", error);
        return;
    }

    console.log("Stores containing block 500:");
    console.log([...new Set(data.map(d => d.loja))]);
}
main();
