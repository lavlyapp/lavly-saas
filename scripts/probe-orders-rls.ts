import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Intentionally using anon to test policies via RPC or SQL script wrapper if needed
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSPolicies() {
    console.log("Checking RLS Policies via direct REST info if possible, or by executing a dummy UPSERT...");

    // Test direct insert into orders
    const { error: ordersErr } = await supabase.from('orders').insert({
        sale_id: 'test-joquei',
        data: new Date().toISOString(),
        loja: 'Lavateria JOQUEI',
        machine: 'Lavadora 1',
        service: 'Lavagem Especial',
        status: 'CONCLUIDO',
        valor: 16.00
    });

    if (ordersErr) {
        console.error("Orders Insert Error:", ordersErr);
    } else {
        console.log("Orders Insert SUCCESS!");
    }
}

checkRLSPolicies();
