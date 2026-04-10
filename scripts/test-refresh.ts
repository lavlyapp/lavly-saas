import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function run() {
    console.log("Refreshing materialized views...");
    
    // Tentativa 1: refresh_mvs() se criamos isso.
    let { error: e1 } = await supabase.rpc('refresh_mvs');
    if (e1) console.error("refresh_mvs errored:", e1);
    else console.log("refresh_mvs success!");
    
    // Se não tivermos RPC, tentamos criar um rápido e usar.
}
run();
