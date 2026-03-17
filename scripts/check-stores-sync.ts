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

async function checkStoresSync() {
    const { data: stores, error } = await supabase
        .from('stores')
        .select('name, last_sync_sales, updated_at');

    if (error) {
        console.error(error);
        return;
    }

    console.log("=== STORES SYNC LOG ===");
    console.table(stores);
}

checkStoresSync();
