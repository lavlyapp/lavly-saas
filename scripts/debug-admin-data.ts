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

async function check() {
    const { data: profiles } = await supabase.from('profiles').select('id, email, role, assigned_stores, created_at, max_stores');
    console.log('--- PROFILES ---');
    console.table(profiles?.map(p => ({ id: p.id.split('-')[0], email: p.email, role: p.role, stores_count: p.assigned_stores?.length || 0 })));

    console.log('\nTotal Assigned Stores:', profiles?.reduce((acc, p) => acc + (p.assigned_stores?.length || 0), 0));
    console.log('Total Max Stores:', profiles?.reduce((acc, p) => acc + (p.max_stores || 0), 0));

    const { data: logs, error: logSchemaErr } = await supabase.from('activity_logs').select('action');
    if (logSchemaErr) {
        console.log('\n--- LOG SCHEMA ERR ---', logSchemaErr);
    } else {
        console.log('\n--- ACTIVITY LOGS UNIQUE ACTIONS ---');
        const actions = [...new Set((logs || []).map((l: any) => l.action))];
        console.log(actions);
    }
}
check();
