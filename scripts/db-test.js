require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function test() {
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey);

    const testSale = {
        id: "TEST-123",
        data: new Date().toISOString(),
        loja: "Lavateria JOSE WALTER",
        cliente: "Teste",
        valor: 10.50,
        forma_pagamento: "PIX"
    };

    console.log("Attempting to insert test sale into 'sales' table...");
    const { data, error } = await db.from('sales').upsert([testSale]);

    if (error) {
        console.error("❌ Insertion failed!");
        console.error("Error code:", error.code);
        console.error("Error details:", error.details);
        console.error("Error message:", error.message);
    } else {
        console.log("✅ Insertion successful.");
    }
}

test().catch(console.error);
