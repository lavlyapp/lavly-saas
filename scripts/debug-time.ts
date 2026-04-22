import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const { data: sales, error } = await supabase
        .from('sales')
        .select('data')
        .order('data', { ascending: false })
        .limit(3);

    console.log("Recent DB Dates (Timestamptz):");
    sales?.forEach(s => console.log(s.data));
}

main();
