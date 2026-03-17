import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getVMPayCredentials, VMPAY_API_BASE_URL } from '../lib/vmpay-config';

// Must use SERVICE ROLE to bypass RLS for debugging
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkSync() {
    console.log("Checking Supabase 'sales' table for recent records...");
    
    // Get sales from the last 48 hours
    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: recentSales, error } = await supabase
        .from('sales')
        .select('id, data, valor, loja')
        .gte('data', twoDaysAgo)
        .order('data', { ascending: false });
        
    if (error) {
        console.error("Error fetching sales:", error.message);
        return;
    }
    
    console.log(`Found ${recentSales.length} sales in the last 48 hours in DB.`);
    if (recentSales.length > 0) {
        console.log("Most recent sale in DB:", recentSales[0].data, "Loja:", recentSales[0].loja, "Valor:", recentSales[0].valor);
    } else {
        console.log("No recent sales found in DB at all!");
    }
    
    // Check stores table for last_sync
    const { data: stores } = await supabase.from('stores').select('name, last_sync_sales');
    console.log("\nLast sync times per store in DB:");
    stores?.forEach(s => console.log(`- ${s.name}: ${s.last_sync_sales}`));
    
    // Fetch directly from VMPay to compare what *should* be there
    const creds = await getVMPayCredentials(supabase);
    if (creds.length > 0) {
        const cred = creds[0];
        console.log(`\nFetching 48-hour history from VMPay API for ${cred.name}...`);
        try {
            const url = `${VMPAY_API_BASE_URL}/vendas?dataInicio=${twoDaysAgo}&dataTermino=${new Date().toISOString()}&somenteSucesso=true&pagina=0&quantidade=100`;
            const res = await fetch(url, { headers: { 'x-api-key': cred.apiKey } });
            const data = await res.json();
            
            if (Array.isArray(data) && data.length > 0) {
                console.log(`VMPay returned ${data.length} sales.`);
                // Sort descending
                data.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
                console.log("Most recent sale from VMPay:", data[0].data, "Valor:", data[0].valor);
                
                // Print a few to inspect the timezone string
                console.log("Samples from VMPay:");
                data.slice(0, 3).forEach(d => console.log(` - ID: ${d.idVenda}, Data: ${d.data}, Valor: ${d.valor}`));
            } else {
                console.log("VMPay returned 0 sales or error:", data);
            }
        } catch (e) {
            console.error(e);
        }
    }
}
checkSync();
