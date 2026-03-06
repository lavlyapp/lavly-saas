import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getVMPayCredentials } from '../lib/vmpay-config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching orders for Joquei...");

    // Pick the first sale_id from the previous test
    const targetSaleId = '50741565000106-29398374';

    const { data: dbOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('sale_id', targetSaleId);

    console.log(`\n--- DB Orders for ${targetSaleId}: ${dbOrders?.length} items ---`);
    console.log(JSON.stringify(dbOrders, null, 2));

    // Now fetch from API
    const creds = await getVMPayCredentials();
    const cred = creds.find(c => c.name.toLowerCase().includes('joquei'));

    if (!cred) return;

    try {
        const url = `${process.env.NEXT_PUBLIC_VMPAY_API_BASE_URL}/vendas?dataInicio=2026-03-02T00:00:00Z&dataTermino=2026-03-02T23:59:59Z&somenteSucesso=true&pagina=0&quantidade=1000`;
        const res = await fetch(url, { headers: { 'x-api-key': cred.apiKey } });
        const data = await res.json();

        if (Array.isArray(data)) {
            const rawSale = data.find(s => String(s.idVenda) === '29398374');
            console.log(`\n\n--- RAW API SALE OBJECT FOR 29398374 ---`);
            console.log(JSON.stringify(rawSale, null, 2));
        }
    } catch (e) {
        console.error("[VMPay API] Error:", e);
    }
}

run();
