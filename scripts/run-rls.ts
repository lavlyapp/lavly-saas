import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL() {
    const sql = fs.readFileSync(path.join(__dirname, '07_fix_stores_rls.sql'), 'utf-8');

    console.log("Applying RLS fix...");
    // Since supabase js doesn't have a direct raw SQL exec method in the client, 
    // we use the rpc 'exec_sql' if available, or we just instruct the user to run it.
    // Wait, let me try a simple select to test if the service role key can read it first.

    const { data, error } = await supabase.from('stores').select('*').limit(1);

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("Service Role Test Select Success. Stores count:", data?.length);
    }
}

runSQL();
