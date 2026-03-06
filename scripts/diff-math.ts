import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getVMPayCredentials } from '../lib/vmpay-config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStore(storeNameMatch: string, startDate: string, endDate: string) {
    const creds = await getVMPayCredentials();
    const cred = creds.find(c => c.name.toLowerCase().includes(storeNameMatch.toLowerCase()));

    if (!cred) {
        console.error(`Store ${storeNameMatch} not found.`);
        return;
    }

    // 1. Fetch from Supabase
    const { data: dbSales, error } = await supabase
        .from('sales')
        .select('id, valor, data')
        .ilike('loja', `%${storeNameMatch}%`)
        .gte('data', startDate)
        .lte('data', endDate);

    const dbMap = new Map();
    if (dbSales) {
        dbSales.forEach((s: any) => {
            // DB IDs are like: CNPJ-VendaID
            const idVenda = s.id.split('-').pop();
            dbMap.set(String(idVenda), s);
        });
    }

    // 2. Fetch from VMPay API
    try {
        const url = `${process.env.NEXT_PUBLIC_VMPAY_API_BASE_URL}/vendas?dataInicio=${startDate.replace('Z', '')}&dataTermino=${endDate.replace('Z', '')}&somenteSucesso=true&pagina=0&quantidade=1000`;
        const res = await fetch(url, { headers: { 'x-api-key': cred.apiKey } });
        const data = await res.json();

        if (Array.isArray(data)) {
            console.log(`\n\n--- MISSING SALES IN DB FOR ${cred.name} ---`);
            data.forEach((s: any) => {
                const idVenda = String(s.idVenda);
                if (!dbMap.has(idVenda)) {
                    console.log(`Missing ID: ${idVenda} | Date: ${s.data} | Value: R$ ${s.valor} | TipoPag: ${s.tipoPagamento}`);
                }
            });
        }
    } catch (e) {
        console.error("[VMPay API] Error:", e);
    }
}

async function run() {
    const startStr = '2026-03-01T00:00:00-03:00';
    const endStr = '2026-03-06T23:59:59-03:00';

    await checkStore('Joquei', startStr, endStr);
    await checkStore('Jose Walter', startStr, endStr);
}

run();
