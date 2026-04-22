import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    console.log("Checking matching between sales and customers...");
    const { data: sales } = await supabase.from('sales').select('cliente').limit(5).not('cliente', 'is', null);
    const { data: customers } = await supabase.from('customers').select('name').limit(5);
    
    console.log("Sales (cliente):", sales);
    console.log("Customers (name):", customers);
}

main().catch(console.error);
