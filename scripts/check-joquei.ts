import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkJoqueiMachines() {
    console.log("Fetching machines for Jóquei store...");

    const { data: stores, error: sErr } = await supabase.from('stores').select('*').ilike('name', '%JOQUEI%');
    console.log("Jóquei Store DB Record:", stores);

    const { count, error } = await supabase.from('orders').select('*', { count: 'exact', head: true }).ilike('loja', '%JOQUEI%');
    console.log(`Orders for JOQUEI in DB: ${count}`);

}

checkJoqueiMachines();
