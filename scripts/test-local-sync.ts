import { getVMPayCredentials } from '../lib/vmpay-config';
import { runGlobalSync } from '../lib/automation/sync-manager';
import { supabaseAdmin } from '../lib/supabase-admin';

async function main() {
    console.log("Testing Global Sync locally against Live Database...");
    
    const creds = await getVMPayCredentials(supabaseAdmin);
    const walter = creds.find(c => c.name.toLowerCase().includes("walter"));
    
    if(!walter) return console.log("Walter not found!");
    
    try {
        const sales = await runGlobalSync(true, false, supabaseAdmin, walter.cnpj);
        console.log(`[OK] Sync manager returned ${sales.length} new or updated sales for JOSE WALTER.`);
    } catch(e) {
        console.error("[ERROR] Local sync test failed:", e);
    }
}

main();
