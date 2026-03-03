
import { supabase } from "./lib/supabase";

async function probe() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[Probe] Checking database for records on ${today}...`);

    const { data, error } = await supabase
        .from('sales')
        .select('id, data, loja, valor')
        .gte('data', `${today}T00:00:00Z`)
        .lte('data', `${today}T23:59:59Z`);

    if (error) {
        console.error("[Probe] Error:", error.message);
        return;
    }

    console.log(`[Probe] Found ${data.length} records in database for today.`);
    if (data.length > 0) {
        const counts: Record<string, number> = {};
        data.forEach(r => {
            counts[r.loja] = (counts[r.loja] || 0) + 1;
        });
        console.log("[Probe] Counts by store:", JSON.stringify(counts, null, 2));
        console.log("[Probe] Sample:", JSON.stringify(data[0], null, 2));
    } else {
        console.log("[Probe] NO RECORDS FOUND IN DATABASE FOR TODAY.");

        // Let's check the last 10 records overall
        const { data: lastRecs } = await supabase
            .from('sales')
            .select('id, data, loja, valor')
            .order('data', { ascending: false })
            .limit(10);

        console.log("[Probe] Last 10 records in DB:", JSON.stringify(lastRecs, null, 2));
    }
}

probe();
