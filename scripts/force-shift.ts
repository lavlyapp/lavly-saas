import { supabaseAdmin } from '../lib/supabase-admin';

async function forceShift() {
    console.log("Forcing PostgreSQL to shift all recent sales +3 Hours into UTC (To match VMPay Ghost Bug)...");
    
    // We execute a direct RPC or we have to read, modify, and upsert
    // Since we don't know if an RPC exists, let's fetch, add 3 hours, and upsert
    
    const { data: sales, error } = await supabaseAdmin
        .from('sales')
        .select('*')
        .gte('data', '2026-03-10T00:00:00.000Z');
        
    if (error) {
        return console.error("Fetch failed", error);
    }
    
    console.log(`Fetched ${sales.length} recent sales. Shifting...`);
    
    const shiftedSales = sales.map(s => {
        // e.g. "2026-03-14T18:15:49.178+00:00" -> We want it to be "21:15"
        const d = new Date(s.data);
        const shifted = new Date(d.getTime() + 3 * 3600 * 1000);
        return {
            ...s,
            data: shifted.toISOString() // Saves as "+00:00" but with the BRT hands on the clock
        };
    });
    
    const { error: upsertErr } = await supabaseAdmin
        .from('sales')
        .upsert(shiftedSales, { onConflict: 'id' });
        
    if (upsertErr) {
         console.error("Shift failed", upsertErr);
    } else {
         console.log("Shift complete. Database now matches VMPay bugged UI.");
    }
}

forceShift();
