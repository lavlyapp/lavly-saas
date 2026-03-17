import { runGlobalSync } from '../lib/automation/sync-manager';
import { supabaseAdmin } from '../lib/supabase-admin';
import { getVMPayCredentials } from '../lib/vmpay-config';

async function healDatabase() {
    console.log("HEALING DATABASE: Syncing the last 3 days with correct Timezone Parsing...");
    
    const credentials = await getVMPayCredentials();
    for (const cred of credentials) {
        console.log(`\n============================`);
        console.log(`Force Healing: ${cred.name}`);
        try {
            // runGlobalSync(isManual=true, force=false, supabaseClient, cnpj)
            // Manual syncs will look back 3 days (Auto-Heal feature in sync-manager)
            await runGlobalSync(true, false, supabaseAdmin, cred.cnpj);
            console.log(`[OK] Successfully healed ${cred.name}`);
        } catch (e: any) {
             console.log(`[ERROR] Healing failed for ${cred.name}:`, e.message);
        }
    }
    
    console.log("\nHealing complete.");
}

healDatabase().catch(console.error);
