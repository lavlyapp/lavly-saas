import { supabase } from './lib/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log("Cleaning up rogue machines from Cascavel in DB...");
    const allowed = ['5900', '5901', '5902', '5903', '5904', '5905'];
    
    // First, let's see how many rogue records there are in `orders`
    const { data: rogueOrders, error: e1 } = await supabase
        .from('orders')
        .select('id_venda, machine')
        .eq('loja', 'Lavateria Cascavel');
        
    if (e1) { console.error("Error fetching orders:", e1); return; }
    
    const ordersToDelete = rogueOrders.filter((o: any) => {
        if (!o.machine) return false;
        // The machine could be mapped like "Lavadora 1" or raw "5931"
        // Since we didn't map them previously, they are probably raw "5931".
        // Let's extract numbers.
        const numMatch = o.machine.match(/\d+/);
        if (!numMatch) return false;
        const num = numMatch[0];
        return !allowed.includes(num); // If not in allowed list, it's rogue
    });
    
    console.log(`Found ${ordersToDelete.length} rogue orders to delete.`);
    
    if (ordersToDelete.length > 0) {
        // Delete in batches of 1000 to be safe
        const idsToDelete = ordersToDelete.map((o: any) => o.id_venda);
        const { error: e2 } = await supabase
            .from('orders')
            .delete()
            .in('id_venda', idsToDelete);
            
        if (e2) console.error("Error deleting:", e2);
        else console.log("Deleted rogue orders!");
    }
    
    // Also cleanup `sales` table (legacy)
    const { data: rogueSales, error: e3 } = await supabase
        .from('sales')
        .select('id, equipamento')
        .eq('loja', 'Lavateria Cascavel');
        
    if (!e3 && rogueSales) {
        const salesToDelete = rogueSales.filter((s: any) => {
            if (!s.equipamento) return false;
            const numMatch = s.equipamento.match(/\d+/);
            if (!numMatch) return false;
            return !allowed.includes(numMatch[0]);
        });
        console.log(`Found ${salesToDelete.length} rogue legacy sales to delete.`);
        if (salesToDelete.length > 0) {
            const idsToDelete = salesToDelete.map((s: any) => s.id);
            const { error: e4 } = await supabase.from('sales').delete().in('id', idsToDelete);
            if (e4) console.error("Error deleting sales:", e4);
            else console.log("Deleted rogue sales!");
        }
    }
    
    console.log("Cleanup complete!");
}
main();
