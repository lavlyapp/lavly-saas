import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testApiLogic() {
    try {
        console.log("1. Fetching auth users...");
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        console.log("2. Fetching profiles...");
        const { data: profiles, error: profilesError } = await supabaseAdmin.from('profiles').select('*');
        if (profilesError) throw profilesError;

        console.log("3. Fetching stores...");
        const { data: storesList, error: storesError } = await supabaseAdmin
            .from('stores')
            .select('id, store_name, city, state, status');

        if (storesError) throw storesError;
        
        console.log(`Successfully fetched ${storesList?.length} stores. Checking status column error...`);
        console.log("First store sample:", storesList?.[0]);

    } catch (e) {
        console.error("API ROUTE ERROR:", e);
    }
}

testApiLogic();
