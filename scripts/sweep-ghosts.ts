import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Starting Ghost Order Cleanup...");

    const cutoffDate = new Date('2026-03-06T10:00:00Z').toISOString();
    console.log(`We will delete ALL orders created BEFORE ${cutoffDate}...`);

    let totalDeleted = 0;

    while (true) {
        const { data: ghosts, error } = await supabase
            .from('orders')
            .select('id')
            .lt('created_at', cutoffDate)
            .limit(500);

        if (error) {
            console.error("Error fetching ghosts:", error);
            break;
        }

        if (!ghosts || ghosts.length === 0) {
            console.log("No more ghosts found.");
            break;
        }

        const idsToDelete = ghosts.map(g => g.id);

        // Chunk deletions
        const CHUNK_SIZE = 50;
        for (let i = 0; i < idsToDelete.length; i += CHUNK_SIZE) {
            const chunk = idsToDelete.slice(i, i + CHUNK_SIZE);
            const { error: delErr } = await supabase
                .from('orders')
                .delete()
                .in('id', chunk);

            if (delErr) {
                console.error("Error deleting chunk:", delErr);
            }
        }

        totalDeleted += ghosts.length;
        console.log(`Deleted ${totalDeleted} ghosts so far...`);
    }

    console.log(`\n✅ Finished Execution! Total corrupted Cestos physically destroyed: ${totalDeleted}`);
}

run();
