import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    console.log("Querying Supabase customers table...");
    const { data: customers, error } = await supabase
        .from('customers')
        .select('id, name, gender')
        .limit(1000);
        
    if (error) {
        console.error("Error:", error);
        return;
    }
    
    console.log(`Received ${customers.length} customers.`);
    
    let stats = { M: 0, F: 0, U: 0, NULL: 0, OTHER: 0 };
    customers.forEach(c => {
        if (c.gender === 'M') stats.M++;
        else if (c.gender === 'F') stats.F++;
        else if (c.gender === 'U') stats.U++;
        else if (c.gender === null) stats.NULL++;
        else {
            Object.keys(stats).includes(c.gender) ? stats[c.gender as keyof typeof stats]++ : stats.OTHER++;
        }
    });
    
    console.log("Stats among customers:", stats);
}

main().catch(console.error);
