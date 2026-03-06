import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getVMPayCredentials } from '../lib/vmpay-config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching specific IDs...");
    const { data: q1 } = await supabase.from('sales').select('*').ilike('id', '%29578078%');
    console.log("ID 29578078 (Joquei):", q1);

    const { data: q2 } = await supabase.from('sales').select('*').ilike('id', '%29575653%');
    console.log("ID 29575653 (Jose Walter):", q2);
}

run();
