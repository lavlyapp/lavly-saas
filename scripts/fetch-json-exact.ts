import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runLocalApi() {
    try {
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        const userMap = new Map(users.map(u => [u.id, { email: u.email, last_sign_in_at: u.last_sign_in_at }]));
        
        const { data: profiles } = await supabaseAdmin.from('profiles').select('*');
        const { data: storesList } = await supabaseAdmin.from('stores').select('id, name, city, state, status');
        
        const totalStores = storesList?.filter(s => s.status !== 'deleted').length || 0;

        let enrichedProfiles = profiles
            .filter(p => p.status !== 'deleted')
            .map(p => ({
                ...p,
                email: userMap.get(p.id)?.email || null,
                last_sign_in_at: userMap.get(p.id)?.last_sign_in_at || null,
                subUsers: [] as any[]
            }));

        const allUsersCount = enrichedProfiles.length;
        const payers = enrichedProfiles.filter(p => p.role !== 'admin' && !p.parent_id);

        console.log(JSON.stringify({
            success: true,
            data: {
                payers: payers.map(p => p.email), // Just print emails for brevity
                totalUsers: allUsersCount,
                totalPhysicalStores: totalStores
            }
        }, null, 2));

    } catch (e) {
        console.error("Fetch Exception:", e);
    }
}

runLocalApi();
