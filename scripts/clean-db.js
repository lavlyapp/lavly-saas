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
    console.log("Starting cleanup...");
    const allowed = ['5900', '5901', '5902', '5903', '5904', '5905'];
    
    // We only need to delete from 'orders', but wait, `sales` also has `equipamento`!
    // 'sales' uses 'id' as primary key.
    // Let's delete rogue sales first.
    console.log("Fetching rogue sales...");
    const { data: rogueSales, error: eSales } = await supabase
        .from('sales')
        .select('id, equipamento')
        .eq('loja', 'Lavateria Cascavel');
        
    if (eSales) {
        console.error("Error fetching sales:", eSales);
    } else {
        const salesToDelete = [];
        for (const s of rogueSales || []) {
            if (!s.equipamento) continue;
            const match = s.equipamento.match(/\d+/);
            if (match && !allowed.includes(match[0])) {
                salesToDelete.push(s.id);
            }
        }
        
        console.log(`Found ${salesToDelete.length} rogue sales.`);
        for (let i = 0; i < salesToDelete.length; i += 1000) {
            const batch = salesToDelete.slice(i, i + 1000);
            await supabase.from('sales').delete().in('id', batch);
            console.log(`Deleted ${batch.length} sales.`);
        }
    }
    
    console.log("Fetching rogue orders...");
    // orders does NOT have an 'id'. It has 'sale_id', 'machine', 'data'.
    const { data: rogueOrders, error: eOrders } = await supabase
        .from('orders')
        .select('sale_id, machine, data')
        .eq('loja', 'Lavateria Cascavel');
        
    if (eOrders) {
        console.error("Error fetching orders:", eOrders);
    } else {
        const ordersToDelete = [];
        for (const o of rogueOrders || []) {
            if (!o.machine) continue;
            const match = o.machine.match(/\d+/);
            if (match && !allowed.includes(match[0])) {
                // To delete from orders, we can match by sale_id since they are unique enough
                ordersToDelete.push(o.sale_id);
            }
        }
        
        console.log(`Found ${ordersToDelete.length} rogue orders.`);
        for (let i = 0; i < ordersToDelete.length; i += 1000) {
            const batch = ordersToDelete.slice(i, i + 1000);
            await supabase.from('orders').delete().in('sale_id', batch);
            console.log(`Deleted ${batch.length} orders.`);
        }
    }
    
    console.log("Cleanup complete!");
}

run();
