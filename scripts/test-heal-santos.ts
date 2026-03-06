import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { syncVMPaySales } from '../lib/vmpay-client';

async function main() {
    console.log("Testing syncVMPaySales directly...");
    const endDate = new Date(); // now
    const startDate = new Date(endDate.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago

    console.log(`Fetching from ${startDate.toISOString()} to ${endDate.toISOString()}...`);

    try {
        const sales = await syncVMPaySales(startDate, endDate);
        console.log(`Received ${sales.length} sales total for all stores.`);

        const santosDumont = sales.filter(s => s.loja?.toUpperCase().includes("DUMONT") || s.loja_id === "53261645000144");
        console.log(`Santos Dumont sales in the last 5 hours: ${santosDumont.length}`);

        if (santosDumont.length > 0) {
            santosDumont.forEach(s => {
                const machines = s.items?.map(i => i.machine).join(', ') || 'None';
                console.log(`- Sale ${s.id} | Date: ${s.data} | Machines: [${machines}] | Value: ${s.valor}`);
            });
        }
    } catch (e: any) {
        console.error("Error testing sync:", e.message);
    }
}

main();
