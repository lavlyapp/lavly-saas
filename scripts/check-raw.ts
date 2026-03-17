import { supabaseAdmin } from '../lib/supabase-admin';

async function checkRaw() {
    const { data } = await supabaseAdmin
        .from('sales')
        .select('id, data')
        .eq('loja', 'Lavateria JOQUEI')
        .order('data', { ascending: false })
        .limit(5);
        
    console.log("Raw Supabase Timestamps for JOQUEI:");
    console.log(JSON.stringify(data, null, 2));
}

checkRaw();
