import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });

    // We can also just query standard supabase.
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: sales, error } = await supabase.from('sales').select('id, data').limit(5);
    console.log("Sales Sample:", sales);
    console.log("Error:", error);
}

main();
