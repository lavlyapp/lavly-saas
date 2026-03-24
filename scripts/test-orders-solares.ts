import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const startStr = "2026-03-23T00:00:00-03:00";
    
    // Fetch orders for Solares today
    const { data: orders, error } = await supabase
        .from('orders')
        .select('id, sale_id, machine, service, valor, data')
        .ilike('loja', '%SOLARES%')
        .gte('data', startStr);

    if (error) { console.error(error); return; }

    const bySaleId = new Map();
    for (const o of orders) {
        if (!bySaleId.has(o.sale_id)) bySaleId.set(o.sale_id, []);
        bySaleId.get(o.sale_id).push(o);
    }
    
    let saleNum = 1;
    let totalValorFromItems = 0;
    for (const [saleId, items] of bySaleId.entries()) {
        console.log(`\nSale #${saleNum} (${saleId}):`);
        let saleValor = 0;
        
        // Deduplicate logic identical to UI
        const uniqueKeys = new Set();
        const validItems = [];
        
        items.forEach((i: any) => {
             const key = `${i.sale_id}-${i.machine}`;
             if (!uniqueKeys.has(key)) {
                 uniqueKeys.add(key);
                 validItems.push(i);
             }
        });
        
        validItems.forEach((i: any) => {
            console.log(`  -> Machine: ${i.machine} | Service: ${i.service} | Valor: ${i.valor} | Data: ${i.data}`);
            saleValor += Number(i.valor);
        });
        
        console.log(`  => Total Calculated for this Sale: R$ ${saleValor.toFixed(2)}`);
        totalValorFromItems += saleValor;
        saleNum++;
    }
    
    console.log(`\nGrand Total if sum of Valid deduplicated Items = R$ ${totalValorFromItems.toFixed(2)}`);
    console.log(`Unique Baskets (Cestos) counted by UI logic: ${orders.length} raw -> deduplicated to... wait.`);
    
    let totalCestos = 0;
    const allUnique = new Set();
    orders.forEach((o: any) => {
        const k = `${o.sale_id}-${o.machine}`;
        allUnique.add(k);
    });
    console.log(`\nTotal Unique Cestos (as shown in Lavly UI): ${allUnique.size}`);
}

main();
