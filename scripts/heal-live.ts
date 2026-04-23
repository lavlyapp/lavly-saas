import { getVMPayCredentials } from '../lib/vmpay-config';

async function healLive() {
    console.log("Triggering Live Vercel Sync for All Stores to Heal Database...");
    
    // We assume the live site at lavly.com.br has the latest pushed code
    const BASE_URL = "https://www.teste.lavly.com.br/api/vmpay/sync";

    const credentials = await getVMPayCredentials();
    for (const cred of credentials) {
        console.log(`\n============================`);
        console.log(`Syncing Live: ${cred.name} (${cred.cnpj})`);
        
        try {
            const res = await fetch(`${BASE_URL}?store=${cred.cnpj}&force=true`, {
                headers: {
                    // Assuming the API allows public trigger or uses a basic protection mechanism
                    // If it requires auth, we might need a cron secret, but the frontend calls it without one usually when logged in
                }
            });
            
            if (res.ok) {
                const data = await res.json();
                console.log(`[OK] Success! Processed ${data.records?.length || 0} records.`);
            } else {
                console.log(`[ERROR] HTTP ${res.status}: ${await res.text()}`);
            }
        } catch (e: any) {
             console.log(`[FATAL] Request failed:`, e.message);
        }
    }
    
    console.log("\nLive Healing Complete.");
}

healLive().catch(console.error);
