import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testUpsert() {
    console.log("Testing dummy upsert to see Supabase error...");

    // Test Sales Insert
    const { error: salesErr } = await supabase.from('sales').upsert([{
        id: 'test-sale-1',
        data: new Date().toISOString(),
        loja: 'LAVATERIA ALDEOTA',
        cliente: 'Test Client',
        valor: 10.50,
        forma_pagamento: 'PIX',
        updated_at: new Date().toISOString()
    }], { onConflict: 'id' });

    if (salesErr) {
        console.error("Sales Insert failed:", salesErr);
    } else {
        console.log("Sales Insert SUCCESS!");

        // Test Orders Insert
        const { error: ordersErr } = await supabase.from('orders').upsert([{
            sale_id: 'test-sale-1',
            data: new Date().toISOString(),
            loja: 'LAVATERIA ALDEOTA',
            cliente: 'Test Client',
            machine: 'Lavadora 1',
            service: 'Lavagem',
            status: 'CONCLUIDO',
            valor: 10.50
        }], { onConflict: 'sale_id, machine, data' });

        if (ordersErr) {
            console.error("Orders Insert failed:", ordersErr);
        } else {
            console.log("Orders Insert SUCCESS!");
        }
    }
}

testUpsert();
