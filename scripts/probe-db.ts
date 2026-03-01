import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
    console.log("Fetching stores...");
    const { data: stores, error: sErr } = await supabase.from('stores').select('*').limit(1);
    console.log("Stores Error:", sErr?.message || "None");
    console.log("Stores Data:", stores?.length);

    console.log("Fetching sales...");
    const { data: sales, error: salErr } = await supabase.from('sales').select('*').limit(1);
    console.log("Sales Error:", salErr?.message || "None");
    console.log("Sales Data:", sales?.length);

    // Check if we can get credentials using the supabase admin key if it exists? No we don't have it here.
}

probe();
