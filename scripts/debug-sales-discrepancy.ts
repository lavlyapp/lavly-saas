import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { startOfDay, endOfDay } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching sales for Cascavel...");

    // The 11 Sale IDs found in the `orders` table today
    const saleIds = [
        "43660010000166-29575866",
        "43660010000166-29576407",
        "43660010000166-29583367",
        "43660010000166-29583546",
        "43660010000166-29585218",
        "43660010000166-29587261",
        "43660010000166-29590745",
        "43660010000166-29569419",
        "43660010000166-29569708",
        "43660010000166-29570159",
        "43660010000166-29570718"
    ];

    const { data: sales, error } = await supabase
        .from('sales')
        .select('id, data')
        .in('id', saleIds);

    console.log("Sales found in Sales Table:");
    if (sales) {
        sales.forEach(s => {
            console.log(`Sale ID: ${s.id} | Timestamp DB: ${s.data}`);
        });
    }
}
main();
