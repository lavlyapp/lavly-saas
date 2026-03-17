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

async function testRlsSyntax() {
    console.log("Testing SQL via RPC or Direct query...");
    const val = "Lavateria JOQUEI";
    
    // Test the logic using raw fetch for the current user's assigned_stores
    const { data, error } = await supabase.from('profiles').select('assigned_stores').limit(1);
    console.log(data, error);
}
testRlsSyntax();
