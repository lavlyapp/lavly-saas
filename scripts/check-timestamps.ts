import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Use service role key to bypass RLS and see absolute truth in DB
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStores() {
    console.log("Checking last_sync_sales for all stores...");
    const { data: stores, error } = await supabase.from('stores').select('name, cnpj, last_sync_sales');

    if (error) {
        console.error("Error:", error);
    } else {
        console.table(stores);
    }
}

checkStores();
