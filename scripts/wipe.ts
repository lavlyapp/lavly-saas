import { getVMPayCredentials } from '../lib/vmpay-config';
import { supabaseAdmin } from '../lib/supabase-admin';

async function wipeAndHeal() {
    console.log("Wiping last 10 days of DB sales to clear ID collisions...");
    const { error } = await supabaseAdmin
        .from('sales')
        .delete()
        .gte('data', '2026-03-04T00:00:00.000Z');
        
    if (error) {
        console.error("Wipe failed:", error);
        return;
    }
    console.log("Wipe successful. Triggering fresh Sync locally...");
    
    const { runGlobalSync } = await import('../lib/automation/sync-manager');
    const credentials = await getVMPayCredentials();
    for (const cred of credentials) {
        console.log(`Syncing: ${cred.name}`);
        // Run a deep sync since we wiped 10 days
        await runGlobalSync(true, true, supabaseAdmin, cred.cnpj);
    }
    
    console.log("Full DB wipe and replace completed.");
}

wipeAndHeal();
