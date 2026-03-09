require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const rSales = await s.from('sales').select('*').limit(1);
    console.log('Sales Row:', rSales.data || rSales.error);

    const rStores = await s.from('stores').select('*').limit(1);
    console.log('Stores Row:', rStores.data || rStores.error);
}
run();
