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

async function checkRealSync() {
    console.log("Checking the absolute latest sales in the 'sales' table for all stores...");

    const { data: sales, error } = await supabase
        .from('sales')
        .select('loja, data, updated_at')
        .order('data', { ascending: false })
        .limit(1000);

    if (error) {
        console.error(error);
        return;
    }

    const latestByData: Record<string, { latestSaleDate: string, updatedTime: string }> = {};
    
    for (const sale of sales || []) {
        if (!latestByData[sale.loja]) {
            latestByData[sale.loja] = { latestSaleDate: sale.data, updatedTime: sale.updated_at };
        }
    }

    console.log("=== LATEST SALE DATES (Max Data) ===");
    console.table(latestByData);

    // Group by max updated_at
    const { data: updatedSales } = await supabase
        .from('sales')
        .select('loja, data, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1000);

    const latestByUpdated: Record<string, { latestSaleDate: string, updatedTime: string }> = {};
    for (const sale of updatedSales || []) {
        if (!latestByUpdated[sale.loja]) {
            latestByUpdated[sale.loja] = { latestSaleDate: sale.data, updatedTime: sale.updated_at };
        }
    }
    console.log("=== LATEST UPSERT TIMES (Max Updated_At) ===");
    console.table(latestByUpdated);
}

checkRealSync();
