import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getVMPayCredentials } from '../lib/vmpay-config';
import { syncVMPaySales } from '../lib/vmpay-client';
import { upsertSales } from '../lib/persistence';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
    console.log("Iniciando reconstrução de 6 meses...");
    const creds = await getVMPayCredentials();
    const days = 180;
    const chunkSize = 15;

    for (const cred of creds) {
        console.log(`\n\n=== Sincronizando ${cred.name} (últimos ${days} dias) ===`);

        let totalStoreSales = 0;

        for (let i = 0; i < Math.ceil(days / chunkSize); i++) {
            const end = new Date();
            end.setDate(end.getDate() - (i * chunkSize));

            const start = new Date(end);
            start.setDate(start.getDate() - chunkSize);

            console.log(`[${cred.name}] Lote ${i + 1}/${Math.ceil(days / chunkSize)}: ${start.toISOString().split('T')[0]} até ${end.toISOString().split('T')[0]}...`);

            try {
                const sales = await syncVMPaySales(start, end, cred);
                if (sales && sales.length > 0) {
                    // Pass explicit supabase client to use env correctly if needed
                    await upsertSales(sales, supabase);
                    totalStoreSales += sales.length;
                    console.log(`✅ ${sales.length} vendas salvas. (Total Parcial: ${totalStoreSales})`);
                } else {
                    console.log(`Nenhuma venda neste período.`);
                }
            } catch (e: any) {
                console.error(`❌ Erro no chunk da loja ${cred.name}:`, e.message);
            }
            // Small delay to prevent rate limits
            await new Promise(r => setTimeout(r, 500));
        }
        console.log(`🚀 Finalizado ${cred.name}. Total: ${totalStoreSales} vendas registradas.`);
    }
    console.log("\n\nSincronização de 6 meses COMPLETA para todas as lojas.");
}

run();
