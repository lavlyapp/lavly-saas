
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function check() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // Check if sales exist for today (UTC range)
    const todayStr = "2026-03-03";
    console.log(`[DB Check] Searching for sales on ${todayStr}...`);

    const { data: sales, error: salesErr } = await supabase
        .from('sales')
        .select('id, data, loja, valor')
        .gte('data', `${todayStr}T00:00:00Z`)
        .lte('data', `${todayStr}T23:59:59Z`);

    if (salesErr) {
        console.log("Error querying sales:", salesErr.message);
    } else {
        console.log(`Found ${sales.length} sales records for today.`);
        if (sales.length > 0) {
            console.log("Stores with sales:", [...new Set(sales.map(s => s.loja))]);
            console.log("Sample sale data:", sales[0].data);
        }
    }

    // Also check the very last 5 sales in the whole table
    const { data: lastFive } = await supabase
        .from('sales')
        .select('id, data, loja, valor')
        .order('data', { ascending: false })
        .limit(5);

    console.log("\nLast 5 sales in database (any date):");
    console.log(JSON.stringify(lastFive, null, 2));
}

check();
