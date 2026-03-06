import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
    const store = "Lavateria Cascavel";

    // Sales for today (March 5, 2026 UTC-3)
    const startOfDay = new Date('2026-03-05T00:00:00-03:00');
    const endOfDay = new Date('2026-03-05T23:59:59-03:00');

    const { data: sales, error } = await supabase
        .from('sales')
        .select('*')
        .eq('loja', store)
        .gte('data', startOfDay.toISOString())
        .lte('data', endOfDay.toISOString());

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    console.log(`[DB] Found ${sales?.length} sales for ${store} today.`);

    if (sales && sales.length > 0) {
        const total = sales.reduce((sum, s) => sum + Number(s.valor), 0);
        console.log(`[DB] Total Value: R$ ${total.toFixed(2)}`);
        console.log(`Last 3 sales recorded:`, sales.slice(-3).map(s => s.data));
    }
}

run();
