const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Starting full cleanup for sales table...");
    const allowed = ['5900', '5901', '5902', '5903', '5904', '5905'];
    
    let hasMore = true;
    let totalDeleted = 0;
    
    while (hasMore) {
        console.log("Fetching up to 1000 sales...");
        const { data: rogueSales, error: eSales } = await supabase
            .from('sales')
            .select('id, produto')
            .eq('loja', 'Lavateria Cascavel')
            .limit(1000);
            
        if (eSales) {
            console.error("Error fetching sales:", eSales);
            break;
        }
        
        if (!rogueSales || rogueSales.length === 0) {
            console.log("No more sales found.");
            break;
        }
        
        const salesToDelete = [];
        let validSales = 0;
        
        for (const s of rogueSales) {
            if (!s.produto) {
                validSales++;
                continue;
            }
            const match = s.produto.match(/\d+/);
            if (match && !allowed.includes(match[0])) {
                salesToDelete.push(s.id);
            } else {
                validSales++;
            }
        }
        
        console.log(`Found ${salesToDelete.length} rogue sales out of ${rogueSales.length} total fetched.`);
        
        if (salesToDelete.length > 0) {
            for (let i = 0; i < salesToDelete.length; i += 100) {
                const batch = salesToDelete.slice(i, i + 100);
                const { error } = await supabase.from('sales').delete().in('id', batch);
                if (error) {
                    console.error("Error deleting sales batch:", error);
                    hasMore = false; // abort
                    break;
                } else {
                    totalDeleted += batch.length;
                    console.log(`Deleted batch of ${batch.length} sales. Total deleted: ${totalDeleted}`);
                }
            }
        }
        
        // If we processed 1000 but couldn't delete any, it means the 1000 are all valid.
        // We'd need pagination to skip the valid ones, otherwise infinite loop.
        if (salesToDelete.length === 0 && rogueSales.length === 1000) {
             console.log("Warning: 1000 valid sales found, but no pagination implemented. Aborting to prevent infinite loop.");
             break;
        } else if (rogueSales.length < 1000) {
            hasMore = false;
        }
    }
    
    console.log(`Cleanup complete! Total deleted: ${totalDeleted}`);
}

run();
