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
        .select('*')
        .eq('loja', 'Lavateria Cascavel')
        .order('data', { ascending: false })
        .limit(5);

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    console.log("Latest 5 records for Cascavel:");
    data.forEach((d, i) => {
        console.log(`\nRecord ${i + 1}:`);
        console.log(`- ID: ${d.id}`);
        console.log(`- Data: ${d.data}`);
        console.log(`- Valor: ${d.valor}`);
        console.log(`- Forma Pagamento (camel): ${d.formaPagamento}`);
        console.log(`- Forma Pagamento (snake): ${d.forma_pagamento}`);
        console.log(`- Tipo Pagamento: ${d.tipoPagamento}`);
        console.log(`- Tipo Cartao: ${d.tipoCartao || d.tipo_cartao}`);
        console.log(`- Full Object Keys:`, Object.keys(d).join(', '));
    });

    // Also get distinct payment types
    const { data: distinctTypes } = await supabase.rpc('get_distinct_payment_types'); // If exists

    const { data: samplePayments } = await supabase
        .from('sales')
        .select('formaPagamento, forma_pagamento, tipoPagamento')
        .limit(100);

    if (samplePayments) {
        const types = new Set();
        samplePayments.forEach(p => {
            if (p.formaPagamento) types.add(p.formaPagamento);
            if (p.forma_pagamento) types.add(p.forma_pagamento);
            if (p.tipoPagamento) types.add(p.tipoPagamento);
        });
        console.log("\nDistinct payment types found in sample:", Array.from(types));
    }
}

run();
