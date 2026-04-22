import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    console.log("Checking match by name vs customer_id...");
    const { data: sales } = await supabase.from('sales').select('cliente, customer_id').limit(100);
    const { data: customers } = await supabase.from('customers').select('id, name, gender');
    
    if (!sales || !customers) return;
    
    let matchedByName = 0;
    let matchedById = 0;
    
    for (const s of sales) {
        if (customers.find(c => c.name.toUpperCase() === s.cliente.toUpperCase())) matchedByName++;
        if (customers.find(c => c.id === s.customer_id)) matchedById++;
    }
    
    console.log(`Out of 100 sales:`);
    console.log(`Matched by Name: ${matchedByName}`);
    console.log(`Matched by ID: ${matchedById}`);
}

main().catch(console.error);
