import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
    const { data } = await supabase.from('sales').select('loja, count').limit(10); // Check if loja column is uniformly set

    // Aggregate using RPC if available, otherwise manual over a sample
    const { data: allSales } = await supabase.from('sales').select('loja, id, valor, forma_pagamento, tipo_cartao').limit(5000);

    if (allSales) {
        const counts: Record<string, number> = {};
        allSales.forEach(s => counts[s.loja] = (counts[s.loja] || 0) + 1);
        console.log("Store breakdown in sample (5000):", counts);

        const unclassified = allSales.filter(s => {
            const type = String(s.forma_pagamento || '').toLowerCase();
            const card = String(s.tipo_cartao || '').toLowerCase();
            return !type.includes('pix') && !type.includes('qrcode') && !type.includes('credito') && !card.includes('credito') && !type.includes('debito') && !card.includes('debito') && !type.includes('voucher') && !type.includes('saldo');
        });
        console.log(`\nUnclassified in sample: ${unclassified.length}`);
        if (unclassified.length > 0) {
            console.log("Samples of unclassified:");
            unclassified.slice(0, 10).forEach(u => console.log(`- ${u.forma_pagamento} / ${u.tipo_cartao} -> R$ ${u.valor}`));
        }
    }
}
run();
