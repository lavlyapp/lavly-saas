import { syncVMPaySales } from './lib/vmpay-client';
import { STATIC_VMPAY_CREDENTIALS } from './lib/vmpay-config';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const cred = STATIC_VMPAY_CREDENTIALS[0]; // Cascavel
    
    const start = new Date(Date.now() - 24 * 3600 * 1000);
    const end = new Date();
    
    console.log(`Syncing sales for ${cred.name}...`);
    const sales = await syncVMPaySales(start, end, cred);
    
    console.log(`Found ${sales.length} sales. First sale:`);
    if (sales.length > 0) {
        console.log(JSON.stringify(sales[0], null, 2));
    }
}
main();
