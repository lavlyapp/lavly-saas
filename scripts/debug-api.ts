import { runGlobalSync } from '../lib/automation/sync-manager';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function debugAPI() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing env info");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    console.log("Running global sync on Joquei with active DB connection...");
    const cnpj = '50741565000106'; // Joquei
    const isManual = true;
    const force = false;

    const newSales = await runGlobalSync(isManual, force, supabaseClient, cnpj);
    
    console.log(`Global Sync returned ${newSales.length} records.`);
}

debugAPI();
