import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkStores() {
    const keys = [
        "486c2cdd-fd33-474f-8ea8-2cd815da4d36",
        "6cbfe881-3bce-45fc-ae2c-3dc0516ec2b7",
        "e0d37d38-e286-4f58-abb9-20a00137ff6e"
    ];

    const { data: stores, error } = await supabaseAdmin
        .from('stores')
        .select('*')
        .in('api_key', keys);
        
    console.log("Stores matching the keys:", stores);
    console.log("Error:", error);
}

checkStores();
