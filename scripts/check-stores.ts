import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStores() {
    const { data: stores, error } = await supabaseAdmin.from('stores').select('*').ilike('name', '%Lavateria%');
    console.log("Found stores:", stores?.length);
    if (stores) {
        stores.forEach(s => console.log(s.id, s.name, s.is_active));
    }
}
checkStores().catch(console.error);
