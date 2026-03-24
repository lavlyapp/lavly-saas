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
    
    // SUM Sales for Solares TODAY
    const { data: sales, error } = await supabase
        .from('sales')
        .select('id, data, valor, loja')
        .ilike('loja', '%SOLARES%')
        .gte('data', startStr);

    if (error) { console.error(error); return; }

    let total = 0;
    sales.forEach(s => total += Number(s.valor));
    
    console.log(`Database Truth for Solares Today:`);
    console.log(`Total Sales Count: ${sales.length}`);
    console.log(`Total Sum (Faturamento): R$ ${total.toFixed(2)}`);
    
    // Show distribution by hour
    const byHour = new Map();
    sales.forEach(s => {
       const h = new Date(s.data).getHours();
       if(!byHour.has(h)) byHour.set(h, 0);
       byHour.set(h, byHour.get(h) + 1);
    });
    console.log(`\nSales by Hour (BRT):`);
    const sorted = Array.from(byHour.keys()).sort((a,b) => a-b);
    for(const h of sorted) {
        console.log(`${h}h: ${byHour.get(h)} vendas`);
    }
}
main();
