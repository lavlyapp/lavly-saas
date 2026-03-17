import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { data: stores } = await supabase.from('stores').select('name, last_sync_sales, updated_at').order('last_sync_sales', { ascending: false });
    console.log("=== STORES LAST SYNC ===");
    console.table(stores);

    const { data: sales } = await supabase.from('sales').select('loja, data, updated_at').order('updated_at', { ascending: false }).limit(5);
    console.log("=== LATEST UPSERTED SALES ===");
    console.table(sales);
}
check();
