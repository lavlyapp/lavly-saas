import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSync() {
    const { data, error } = await supabase.from('stores').select('name, cnpj, last_sync_sales');
    if (error) {
        console.error("Error fetching stores:", error);
    } else {
        console.log("Current DB Status for Stores:");
        console.table(data);
    }
}

checkSync();
