import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
    const store = "Lavateria Cascavel";

    const start = new Date('2026-03-01T00:00:00-03:00');
    const end = new Date('2026-03-05T23:59:59-03:00');

    const { data: orders, error } = await supabase
        .from('orders')
        .select('sale_id, data, valor, machine, service')
        .eq('loja', store)
        .gte('data', start.toISOString())
        .lte('data', end.toISOString());

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    console.log(`[DB] Found ${orders?.length} orders for ${store} since March 1st.`);

    if (orders && orders.length > 0) {
        // Check for duplicates based on sale_id + machine + data
        const keys = new Set();
        const dups: any[] = [];
        orders.forEach(o => {
            const key = `${o.sale_id}-${o.machine}-${o.data}`;
            if (keys.has(key)) {
                dups.push(key);
            } else {
                keys.add(key);
            }
        });

        // Check for offset duplicates: same sale_id + machine, but different data
        const offsetKeys = new Set();
        const offsetDups: any[] = [];
        orders.forEach(o => {
            const key = `${o.sale_id}-${o.machine}`;
            if (offsetKeys.has(key)) {
                offsetDups.push(key);
            } else {
                offsetKeys.add(key);
            }
        });

        console.log(`Exact Dups: ${dups.length}`);
        console.log(`Possible Timezone Dups (same sale, same machine, diff time): ${offsetDups.length - dups.length}`);
    }
}

run();
