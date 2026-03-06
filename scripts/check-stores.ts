import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
    console.log("Checking unique stores via RPC or pagination...");

    const stores = new Set();
    let page = 0;
    while (true) {
        const { data } = await supabase.from('sales').select('loja').range(page * 1000, (page + 1) * 1000 - 1);
        if (!data || data.length === 0) break;
        data.forEach(d => stores.add(d.loja));
        page++;
    }

    console.log("Real Unique Stores in DB:", Array.from(stores));
}
run();
