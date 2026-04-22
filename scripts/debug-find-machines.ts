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
        .ilike('machine', '%500%')
        .order('data', { ascending: false })
        .limit(10);

    const { data: data2, error: err2 } = await supabase
        .from('orders')
        .select('loja, machine')
        .ilike('machine', '%1000L%')
        .order('data', { ascending: false })
        .limit(10);

    console.log(`Stores with 500:`, data?.map(d => `${d.loja}: ${d.machine}`));
    console.log(`Stores with 1000L:`, data2?.map(d => `${d.loja}: ${d.machine}`));
}

main();
