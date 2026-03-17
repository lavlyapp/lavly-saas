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

async function getProfileColumns() {
    console.log("Fetching profiles schema...");
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error("Error fetching profiles:", error);
    } else {
        console.log("Columns from first profile record:", Object.keys(profile[0] || {}));
    }
}

getProfileColumns();
