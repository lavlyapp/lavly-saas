import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function wipeTable(tableName: string, idField = 'id') {
    console.log(`Wiping all records from ${tableName}...`);
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from(tableName)
            .select(idField)
            .limit(100);

        if (error) {
            console.error(`Error selecting from ${tableName}:`, error);
            break;
        }

        if (!data || data.length === 0) {
            hasMore = false;
            break;
        }

        const ids = data.map((d: any) => d[idField]);
        const { error: delError } = await supabase
            .from(tableName)
            .delete()
            .in(idField, ids);

        if (delError) {
            console.error(`Error deleting from ${tableName}:`, delError);
            break;
        }

        totalDeleted += ids.length;
        console.log(`Deleted ${totalDeleted} records from ${tableName}...`);
    }
    console.log(`Finished wiping ${tableName}. Total deleted: ${totalDeleted}`);
}

async function run() {
    await wipeTable('orders', 'id');
    await wipeTable('sales', 'id');
    await wipeTable('customers', 'id');
    console.log("Database Wipe Complete.");
}

run();
