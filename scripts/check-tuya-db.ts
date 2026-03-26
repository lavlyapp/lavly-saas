import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    const { data: stores, error } = await supabaseAdmin
        .from('stores')
        .select('id, name, tuya_scene_on_id, tuya_scene_off_id, tuya_client_id, tuya_client_secret');

    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log(stores.filter(s => s.tuya_client_id));
}
run();
