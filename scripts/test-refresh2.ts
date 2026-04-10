import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function run() {
    console.log("Refreshing lavly_materialized_views...");
    let { error } = await supabase.rpc('refresh_lavly_materialized_views');
    if (error) console.error("Error:", error);
    else console.log("Success!");
}
run();
