import { syncVMPaySales } from '../lib/vmpay-client';
import { getVMPayCredentials } from '../lib/vmpay-config';
import { upsertSales } from '../lib/persistence';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testSync() {
    console.log("Starting test sync for Jóquei...");

    // Create a fake cookie mechanism to avoid the RLS error when testing locally
    // but here we just want to bypass RLS for testing by using the Service Role Key, 
    // or just relying on the fact that running directly via the script might hit the RLS if not careful.
    // Wait, let's use the explicit Supabase client with the SERVICE ROLE if needed, but for now, 
    // let's just trace the *SQL error*. The RLS error was already fixed for the auth user session.

    // We will simulate a user session by passing the anon key, but we know it fails RLS. 
    // Let's test just the first part: fetching and forming the orders array to see if any have null dates.

    const creds = await getVMPayCredentials();
    const joqueiCred = creds.find(c => c.name.includes("JOQUEI"));

    if (!joqueiCred) {
        console.error("Jóquei credential not found!");
        return;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 15);

    console.log(`Fetching sales for ${joqueiCred.name} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const sales = await syncVMPaySales(startDate, endDate, joqueiCred);
    console.log(`Fetched ${sales.length} sales.`);

    // Let's inspect the orders that would be generated
    const ordersToUpsert = sales.flatMap(r =>
        (r.items || []).map(item => ({
            sale_id: r.id,
            data: item.startTime ? item.startTime.toISOString() : r.data.toISOString(),
            loja: r.loja,
            machine: item.machine,
            service: item.service,
            status: item.status,
            valor: item.value || 0
        }))
    );

    console.log(`Generated ${ordersToUpsert.length} orders.`);

    // Let's look for any orders that might violate the constraint (sale_id, machine, data)
    const seen = new Set();
    let duplicates = 0;

    for (const o of ordersToUpsert) {
        const key = `${o.sale_id}_${o.machine}_${o.data}`;
        if (seen.has(key)) {
            console.error("🚨 DUPLICATE ORDER DETECTED IN SAME BATCH:", o);
            duplicates++;
        }
        seen.add(key);
    }

    console.log(`Duplicates found: ${duplicates}`);

    // Check for weird data
    const weirdDates = ordersToUpsert.filter(o => !o.data || o.data.includes('1970'));
    if (weirdDates.length > 0) {
        console.log(`Found ${weirdDates.length} weird dates:`, weirdDates.slice(0, 3));
    }
}

testSync();
