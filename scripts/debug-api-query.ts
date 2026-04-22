import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const store = "Cascavel";
    const nowUtc = new Date();
    const startQuery = new Date(nowUtc.getTime() - 24 * 3600 * 1000).toISOString();
    const endQuery = nowUtc.toISOString();

    let q = adminClient.from('orders')
        .select('*')
        .gte('data', startQuery)
        .lte('data', endQuery)
        .order('data', { ascending: false })
        .range(0, 999);

    if (store !== 'Todas') {
        q.eq('loja', store);
    }

    console.log("Fetching query for store:", store);
    const { data, error } = await q;

    if (error) {
        console.error("Error:", error);
    } else {
        const uniqueMachines = new Set(data.map((d: any) => d.machine));
        console.log(`Found ${data.length} records.`);
        console.log(`Unique machines for ${store} exactly as requested by API:`, Array.from(uniqueMachines).join(', '));
    }
}

main();
