import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkStores() {
    console.log("Checking unique store names recorded in Orders table...");
    const { data: stores, error: sErr } = await supabase.from('orders').select('loja');
    if (sErr) {
        console.error("Error fetching stores:", sErr);
        return;
    }

    const unique = new Set(stores?.map(s => s.loja));
    console.log("Unique Lojas in Orders:", Array.from(unique));

    // Check specific records for Jóquei
    const { data: joquei, error: jErr } = await supabase.from('orders').select('*').ilike('loja', '%JOQUEI%').limit(5);
    console.log("Jóquei Sample Orders:", joquei);
}

checkStores();
