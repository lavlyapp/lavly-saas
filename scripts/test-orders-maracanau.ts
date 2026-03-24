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
    
    const { data: orders, error } = await supabase
        .from('orders')
        .select('id, sale_id, machine, service, valor, data, created_at')
        .ilike('loja', '%MARACANAU%')
        .gte('data', startStr);

    if (error) { console.error(error); return; }

    const bySaleId = new Map();
    for (const o of orders) {
        if (!bySaleId.has(o.sale_id)) bySaleId.set(o.sale_id, []);
        bySaleId.get(o.sale_id).push(o);
    }
    
    let sumOrdersValue = 0;
    
    console.log(`RAW ORDERS FOR MARACANAU TODAY:`);
    for (const [saleId, items] of bySaleId.entries()) {
        const totalVal = items.reduce((sum: number, i: any) => sum + Number(i.valor), 0);
        console.log(`Sale ${saleId} has ${items.length} items. (Item Valor sum: ${totalVal})`);
        items.forEach((i: any) => {
             console.log(`    [ ] ${i.machine} | ${i.service} | ${i.valor} | data: ${i.data} | created: ${i.created_at}`);
             sumOrdersValue += Number(i.valor);
        });
    }

    console.log(`\nTotal mathematically generated Orders: ${orders.length}`);
    console.log(`Total Value from Orders: ${sumOrdersValue.toFixed(2)}`);
}

main();
