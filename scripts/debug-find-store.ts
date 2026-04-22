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
        .in('machine', ['500', '501', '502', '503', '504', '505', '1000L'])
        .order('data', { ascending: false })
        .limit(1000);

    const storeMap = new Map();
    orders?.forEach(o => {
        if (!storeMap.has(o.loja)) {
            storeMap.set(o.loja, new Set());
        }
        storeMap.get(o.loja).add(o.machine);
    });

    for (const [store, machines] of storeMap.entries()) {
        console.log(`Store: ${store} -> Machines:`, Array.from(machines).join(', '));
    }
}

main();
