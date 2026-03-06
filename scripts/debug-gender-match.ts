import { calculateCrmMetrics } from "../lib/processing/crm";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    "https://ftbhivcltxoakwjuvqax.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YmhpdmNsdHhvYWt3anV2cWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDU5MTksImV4cCI6MjA4NzUyMTkxOX0.S_FdBD4TmkcZSnzF-inzZCKCxezn5WUHM4FXnNa3jrY"
);

async function run() {
    console.log("Fetching ALL customers...");
    const allCustomers = [];
    let page = 0;
    while (true) {
        const { data } = await supabase.from('customers').select('*').range(page * 5000, (page + 1) * 5000 - 1);
        if (!data || data.length === 0) break;
        allCustomers.push(...data);
        page++;
    }

    console.log("Fetching latest sales...");
    const { data: sales } = await supabase.from('sales').select('*').order('data', { ascending: false }).limit(10000);

    console.log(`Loaded ${allCustomers.length} customers and ${sales?.length} sales.`);

    // Map sales
    const mappedSales = (sales || []).map(s => ({
        id: s.id,
        data: new Date(s.data),
        loja: s.loja,
        cliente: s.cliente,
        produto: s.produto,
        valor: Number(s.valor),
        formaPagamento: s.forma_pagamento,
        tipoCartao: s.tipo_cartao,
        categoriaVoucher: s.categoria_voucher,
        desconto: Number(s.desconto),
        telefone: s.telefone,
        customerId: s.customer_id,
        originalRow: 0
    }));

    const mappedCustomers = allCustomers.map(c => ({
        id: c.id,
        cpf: c.cpf || '',
        name: c.name || '',
        phone: c.phone || '',
        email: c.email || '',
        gender: c.gender || 'U',
        registrationDate: c.registration_date ? new Date(c.registration_date) : undefined,
        originalRow: 0
    }));

    console.log("Sample mappedCustomers gender spread:");
    const cStats = { M: 0, F: 0, U: 0 };
    mappedCustomers.forEach(c => cStats[(c.gender as 'M' | 'F' | 'U') || 'U']++);
    console.log(cStats);

    const metrics = calculateCrmMetrics(mappedSales as any, mappedCustomers);

    const genderStats = { M: 0, F: 0, U: 0 };
    metrics.profiles.forEach((p: any) => {
        genderStats[(p.gender as 'M' | 'F' | 'U') || 'U']++;
    });

    console.log("CRM Result Gender Spread:", genderStats);
}

run().catch(console.error);
