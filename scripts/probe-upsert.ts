import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
    console.log("Attempting to upsert into sales with anon key...");

    const fakeSale = {
        id: "TST-99999",
        data: new Date().toISOString(),
        loja: "Lavateria Cascavel",
        produto: "LAVAGEM",
        valor: 10.0,
        forma_pagamento: "PIX"
    };

    const { data, error } = await supabase
        .from('sales')
        .upsert([fakeSale], { onConflict: 'id' })
        .select();

    if (error) {
        console.error("UPSERT ERROR:", error.message, error.code, error.details);
    } else {
        console.log("UPSERT SUCCESS. Data returned:", data);
    }
}

probe();
