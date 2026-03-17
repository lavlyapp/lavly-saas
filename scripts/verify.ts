import { getVMPayCredentials } from '../lib/vmpay-config';
import { supabaseAdmin } from '../lib/supabase-admin';

async function verify() {
    const credentials = await getVMPayCredentials();
    const cred = credentials.find(c => c.name.toLowerCase().includes("joquei"));
    
    // In UTC, "Today Mar 14th" without offset means exactly Mar 14 00:00:00 to 23:59:59
    const { data: dbSales } = await supabaseAdmin
        .from('sales')
        .select('*')
        .eq('loja', cred?.name)
        .gte('data', '2026-03-14T00:00:00.000Z')
        .lte('data', '2026-03-14T23:59:59.999Z');

    let total = 0;
    dbSales?.forEach(r => total += r.valor);
    console.log(`[VERIFICATION] Joquei UTC 'Today' Sales: ${dbSales?.length} | R$ ${total.toFixed(2)}`);
}

verify();
