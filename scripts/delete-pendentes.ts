import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Locating orphaned stores...");
    const { data, error } = await supabase
        .from('stores')
        .delete()
        .like('name', 'Loja Pendente%')
        .select();

    if (error) {
        console.error('Error:', error);
        process.exit(1);
    } else {
        console.log(`Deleted ${data.length} orphaned stores:`, data.map(d => d.store_name));
        process.exit(0);
    }
}

main();
