require('dotenv').config({ path: '.env.local' });
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: "commonjs" } });

const { runGlobalSync } = require('./lib/automation/sync-manager.ts');
const { createClient } = require('@supabase/supabase-js');

async function test() {
    console.log("Starting runGlobalSync mock test...");

    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey);

    const isManual = true;
    const force = true;
    const cnpj = '53261614000193'; // JOSE WALTER

    try {
        const newSales = await runGlobalSync(isManual, force, supabaseClient, cnpj);
        console.log(`\n✅ TEST COMPLETE: ${newSales.length} sales returned by runGlobalSync`);
    } catch (e) {
        console.error("❌ TEST FAILED:", e);
    }
}

test().catch(console.error);
