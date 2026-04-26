import { supabase } from './lib/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    
    const { data: orders, error } = await supabase
        .from('orders')
        .select('loja, machine')
        .gte('data', thirtyDaysAgo);
        
    if (error) {
        console.error("Query failed", error);
        return;
    }
    
    console.log(`Found ${orders.length} orders in last 30 days.`);
    
    const storeMachines: Record<string, Set<string>> = {};
    orders.forEach((o: any) => {
        if (!o.machine) return;
        if (!storeMachines[o.loja]) storeMachines[o.loja] = new Set();
        storeMachines[o.loja].add(o.machine);
    });
    
    let totalWashers = 0;
    let totalDryers = 0;
    
    for (const [store, machines] of Object.entries(storeMachines)) {
        console.log(`\nStore: ${store} (${machines.size} machines)`);
        let washers = 0;
        let dryers = 0;
        for (const m of Array.from(machines).sort()) {
            const numMatch = m.match(/\d+/);
            const num = numMatch ? parseInt(numMatch[0]) : 0;
            let isDryer = num % 2 !== 0;
            // Since some stores use Lavadora 1, Secadora 2
            if (m.toLowerCase().includes('sec')) isDryer = true;
            if (m.toLowerCase().includes('lav')) isDryer = false;
            
            if (isDryer) dryers++; else washers++;
            console.log(`  - ${m} (${isDryer ? 'Secadora' : 'Lavadora'})`);
        }
        totalWashers += washers;
        totalDryers += dryers;
        console.log(`  Total: ${washers} Washers, ${dryers} Dryers`);
    }
    
    console.log(`\nGRAND TOTAL: ${totalWashers} Washers, ${totalDryers} Dryers`);
}

main();
