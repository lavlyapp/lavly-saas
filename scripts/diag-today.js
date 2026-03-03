
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTodaySales() {
    const now = new Date();
    // In Brazil, start of day is UTC-3. 
    // Let's check sales since midnight today in Brasilia time.
    const todayBR = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    todayBR.setHours(0, 0, 0, 0);

    // Convert back to UTC for query
    const startOfToday = new Date(todayBR.getTime() - (todayBR.getTimezoneOffset() * 60000));
    const startIso = startOfToday.toISOString().split('T')[0] + 'T00:00:00Z';

    console.log(`Checking sales in DB since: ${startIso}`);

    const { data: stores, error: storeErr } = await supabase.from('stores').select('name, cnpj');
    if (storeErr) { console.error(storeErr); return; }

    console.log(`\n--- STORE SUMMARY FOR TODAY ---`);
    for (const store of stores) {
        const { count: salesCount } = await supabase
            .from('sales')
            .select('*', { count: 'exact', head: true })
            .eq('loja', store.name)
            .gte('data', startIso);

        const { count: cestosCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('loja', store.name)
            .gte('data', startIso);

        console.log(`${store.name.padEnd(30)}: ${String(salesCount || 0).padStart(3)} sales | ${String(cestosCount || 0).padStart(3)} cestos`);
    }

    const { count: totalSales } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .gte('data', startIso);

    const { count: totalCestos } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('data', startIso);

    console.log(`\nTOTAL SALES: ${totalSales || 0}`);
    console.log(`TOTAL CESTOS: ${totalCestos || 0}`);
}

checkTodaySales();
