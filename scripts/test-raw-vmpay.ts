import { getVMPayCredentials } from '../lib/vmpay-config';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function checkRawVMPay() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const credentials = await getVMPayCredentials(supabaseClient);

    const endDate = new Date();
    const startDate = new Date('2026-03-13T11:39:00.000Z');
    const startStr = startDate.toISOString().replace('Z', '');
    const endStr = endDate.toISOString().replace('Z', '');

    console.log(`Checking raw VMPay API for sales between ${startStr} and ${endStr}`);

    for (const store of credentials) {
        const url = `https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=50`;
        try {
            const res = await fetch(url, { headers: { 'x-api-key': store.apiKey }});
            if (res.ok) {
                const data = await res.json();
                console.log(`\n=== ${store.name} ===`);
                if (data.length > 0) {
                    console.log(`Found ${data.length} recent sales. Latest:`);
                    for (const s of data) {
                        console.log(`  - DB: ${s.data} | Machine: ${s.equipamento || s.pedido?.itens?.[0]?.maquina} | R$ ${s.valor}`);
                    }
                } else {
                    console.log(`0 sales returned by VMPay.`);
                }
            } else {
                console.log(`${store.name} Error:`, res.status);
            }
        } catch(e: any) {
            console.log(`Failed request:`, e.message);
        }
    }
}
checkRawVMPay();
