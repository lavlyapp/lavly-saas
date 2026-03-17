import { getVMPayCredentials } from '../lib/vmpay-config';
import { syncVMPaySales } from '../lib/vmpay-client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '.env.local') });

async function debugJoquei() {
    console.log("Fetching credentials...");
    const credentials = await getVMPayCredentials();
    const joquei = credentials.find(c => c.name.toLowerCase().includes('joquei'));
    
    if (!joquei) {
        console.error("Lavateria Joquei credentials not found");
        return;
    }

    console.log("Credentials found for:", joquei.name, "CNPJ:", joquei.cnpj);

    const now = new Date();
    // Auto-Heal logic: 3 days ago
    const lastSync = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    console.log(`Simulating syncVMPaySales from ${lastSync.toISOString()} to ${now.toISOString()}...`);
    const sales = await syncVMPaySales(lastSync, now, joquei);
    
    console.log(`Result: ${sales.length} sales found.`);
    if (sales.length > 0) {
        console.log("Sample sale 0:", sales[0].data, sales[0].valor);
    }
}

debugJoquei();
