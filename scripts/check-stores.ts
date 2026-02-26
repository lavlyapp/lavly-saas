import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase credentials missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStores() {
    console.log('Checking stores table...');
    const { data, error } = await supabase
        .from('stores')
        .select('*');

    if (error) {
        console.error('Error fetching stores:', error);
        return;
    }

    console.log(`Found ${data.length} stores:`);
    data.forEach(s => {
        console.log(`- ${s.name} (CNPJ: ${s.cnpj}, Active: ${s.is_active}, HasSyncLink: ${!!s.api_key})`);
    });
}

checkStores();
