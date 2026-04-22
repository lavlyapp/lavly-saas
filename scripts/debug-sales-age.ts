import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    console.log("Checking sales table for age field...");
    const { data: sales, error } = await supabase.from('sales').select('id, age, birth_date').limit(5).not('age', 'is', null);
    if (error) {
        console.log("Error querying age:", error.message);
    } else {
        console.log("Sales with age:", sales);
    }
}

main().catch(console.error);
