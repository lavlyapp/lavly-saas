import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resetTodaySales() {
    console.log("Apagando todas as vendas registradas hoje (13 de Março de 2026)...");
    
    const { error: salesErr } = await supabase
        .from('sales')
        .delete()
        .gte('data', '2026-03-13T00:00:00Z');
    
    if (salesErr) console.error("Erro na tabela Sales:", salesErr.message);

    console.log("Apagando todos os pedidos registrados hoje...");
    const { error: ordersErr } = await supabase
        .from('orders')
        .delete()
        .gte('date', '2026-03-13T00:00:00Z');
        
    if (ordersErr) console.error("Erro na tabela Orders:", ordersErr.message);

    console.log("Retrocedendo a data de última sincronização de todas as lojas para ontem (23:59)...");
    const { error: storesErr } = await supabase
        .from('stores')
        .update({ last_sync_sales: '2026-03-12T23:59:00Z' })
        .not('cnpj', 'is', null);

    if (storesErr) console.error("Erro na tabela Stores:", storesErr.message);

    console.log("\nO Banco de Dados foi redefinido para Ontem de noite!");
    console.log("Se clicar em Sync na Vercel agora, ele fará o download de todas as vendas do dia de hoje (dia 13) como novas.");
}
resetTodaySales();
