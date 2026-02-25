
import { syncVMPaySales } from '../lib/vmpay-client';

async function main() {
    console.log("Starting Debug Sync...");

    // Simulate the 120 day window
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - 120);

    console.log(`Range: ${startDate.toISOString()} to ${now.toISOString()}`);

    try {
        const records = await syncVMPaySales(startDate, now);
        console.log(`Sync Completed. Records found: ${records.length}`);

        if (records.length > 0) {
            console.log("First Record Sample:", records[0]);
            console.log("Last Record Sample:", records[records.length - 1]);
        }
    } catch (e) {
        console.error("Sync Failed:", e);
    }
}

main();
