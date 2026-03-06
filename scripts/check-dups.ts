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
        // Check for duplicates based on sale_id
        const saleIds = RegExp ? new Set() : new Set();
        const dups: any[] = [];
        orders.forEach(o => {
            if (saleIds.has(o.sale_id)) {
                dups.push(o.sale_id);
            } else {
                saleIds.add(o.sale_id);
            }
        });
        console.log(`Unique sales: ${saleIds.size}`);
        console.log(`Duplicates: ${dups.length}`);
        if (dups.length > 0) {
            console.log(`First few duplicate IDs: ${dups.slice(0, 5)}`);
            const sampleDup = orders.filter(o => o.sale_id === dups[0]);
            console.log(`Sample Duplicate Record Details:`, sampleDup);
        }
    }
}

run();
