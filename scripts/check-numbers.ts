import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
    const store = 'Lavateria Cascavel';
    console.log(`Checking data for store: ${store} for today`);

    // Find today's sales for Cascavel
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startStr = startOfDay.toISOString();

    const { data: sales, error } = await supabase
        .from('sales')
        .select('*')
        .eq('loja', store)
        .gte('data', startStr);

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    let totalRaw = 0;
    let pix = 0;
    let credit = 0;
    let debit = 0;
    let vouchers = 0;
    let others = 0;

    sales.forEach(s => {
        totalRaw += s.valor;
        const type = String(s.forma_pagamento || '').toLowerCase();
        const card = String(s.tipo_cartao || '').toLowerCase();
        if (type.includes('pix') || type.includes('qrcode')) pix += s.valor;
        else if (type.includes('credito') || card.includes('credito')) credit += s.valor;
        else if (type.includes('debito') || card.includes('debito')) debit += s.valor;
        else if (type.includes('voucher') || type.includes('saldo')) vouchers += s.valor;
        else others += s.valor;
    });

    console.log(`Hoje (${startStr}):`);
    console.log(`Total Sales Count: ${sales.length}`);
    console.log(`Total Valor: R$ ${totalRaw.toFixed(2)}`);
    console.log(`PIX: R$ ${pix.toFixed(2)}`);
    console.log(`Credit: R$ ${credit.toFixed(2)}`);
    console.log(`Debit: R$ ${debit.toFixed(2)}`);
    console.log(`Vouchers: R$ ${vouchers.toFixed(2)}`);
    console.log(`Others: R$ ${others.toFixed(2)}`);

    // Monthly
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startMonthStr = startOfMonth.toISOString();

    const { data: monthSales } = await supabase
        .from('sales')
        .select('valor')
        .eq('loja', store)
        .gte('data', startMonthStr);

    let monthTotal = 0;
    monthSales?.forEach(s => monthTotal += s.valor);
    console.log(`\nMonth to Date (${startMonthStr}): Total R$ ${monthTotal.toFixed(2)} from ${monthSales?.length} sales.`);

    // Check store names
    const { data: allStores } = await supabase.from('sales').select('loja');
    const uniqueStores = new Set(allStores?.map(s => s.loja));
    console.log(`\nUnique stores in DB:`, Array.from(uniqueStores));

}

run();
