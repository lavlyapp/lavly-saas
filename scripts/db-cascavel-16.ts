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
        .select('*')
        .eq('loja', 'Lavateria Cascavel')
        .eq('machine', '5900')
        .gte('data', '2026-04-16T00:00:00.000Z')
        .lt('data', '2026-04-17T00:00:00.000Z')
        .order('data', { ascending: false })
        .limit(5);

    if (error) {
        console.error("error", error);
        return;
    }
    console.log("Data in DB:", JSON.stringify(data, null, 2));
}
main();
