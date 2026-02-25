
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase URL or Key missing in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStores() {
    console.log("Checking stores in Supabase...");
    const { data, error } = await supabase
        .from('stores')
        .select('name, cnpj, is_active, api_key, last_sync_sales');

    if (error) {
        console.error("Error fetching stores:", error);
        return;
    }

    console.log(`Total stores found: ${data?.length || 0}`);
    data?.forEach(s => {
        console.log(`- Store: ${s.name} | Active: ${s.is_active} | Has API Key: ${!!s.api_key} | Last Sync: ${s.last_sync_sales}`);
    });
}

checkStores();
