import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
    const { data, error } = await supabase
        .from('sales')
        .select('valor, data')
        .eq('loja', 'Lavateria Cascavel')
        .gte('data', '2026-03-01T00:00:00-03:00')
        .lte('data', '2026-03-31T23:59:59-03:00');

    if (error) {
        console.error(error);
        return;
    }

    let total = 0;
    data.forEach((r: any) => total += r.valor);
    console.log(`Cascavel March 2026 DB Total: R$ ${total.toFixed(2)} (${data.length} sales)`);

    const allSales = await supabase.from('sales').select('valor, data').gte('data', '2026-03-01T00:00:00-03:00');
    let allTotal = 0;
    allSales.data?.forEach((r: any) => allTotal += r.valor);
    console.log(`ALL Stores March 2026 DB Total: R$ ${allTotal.toFixed(2)} (${allSales.data?.length} sales)`);
}
run();
