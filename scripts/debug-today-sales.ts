
import { syncVMPaySales } from "./lib/vmpay-client";
import { STATIC_VMPAY_CREDENTIALS } from "./lib/vmpay-config";

async function debugToday() {
    const cred = STATIC_VMPAY_CREDENTIALS.find(c => c.name.includes("Cascavel"));
    if (!cred) {
        console.error("Cascavel credentials not found");
        process.exit(1);
    }

    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0); // Local 00:00

    const end = new Date(today);
    end.setHours(23, 59, 59, 999); // Local 23:59

    console.log(`[Debug] Fetching sales for ${cred.name} from ${start.toISOString()} to ${end.toISOString()}...`);

    try {
        const sales = await syncVMPaySales(start, end, cred);
        console.log(`[Debug] Found ${sales.length} sales.`);
        if (sales.length > 0) {
            console.log("[Debug] First sale sample:", JSON.stringify({
                id: sales[0].id,
                data: sales[0].data, // This is a Date object
                iso: sales[0].data.toISOString(),
                loja: sales[0].loja,
                cliente: sales[0].cliente,
                valor: sales[0].valor
            }, null, 2));
        }
    } catch (e) {
        console.error("[Debug] Error:", e);
    }
}

debugToday();
