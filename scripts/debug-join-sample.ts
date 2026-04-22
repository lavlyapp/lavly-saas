import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    console.log("Printing a few actual names:");
    const { data: sales } = await supabase.from('sales').select('cliente, id, data').limit(3).not('cliente', 'is', null);
    const { data: customers } = await supabase.from('customers').select('name').limit(10);
    
    console.log("Sales cliente sample:", sales);
    console.log("Customers name sample:", customers);
}

main().catch(console.error);
