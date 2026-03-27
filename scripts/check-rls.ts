import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkPolicies() {
    const { data, error } = await supabaseAdmin.rpc('get_table_policies', { table_name_input: 'sales' });
    
    if (error) {
        // Fallback: Query pg_policies directly
        const res = await supabaseAdmin.from('_test_').select().limit(1); // just a ping
        console.log("RPC get_table_policies failed, attempting direct query via postgres...");
        // Not easily possible via REST without a custom RPC or using raw SQL.
        console.error(error);
    } else {
        console.log("Policies:", JSON.stringify(data, null, 2));
    }
}

checkPolicies();
