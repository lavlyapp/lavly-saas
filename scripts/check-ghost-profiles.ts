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

async function checkGhostProfiles() {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const { data: profiles } = await supabaseAdmin.from('profiles').select('*');
    
    console.log('Total Auth Users:', users.length);
    console.log('Total Public Profiles:', profiles?.length || 0);

    const userIds = new Set(users.map(u => u.id));
    const ghosts = profiles?.filter(p => !userIds.has(p.id)) || [];

    console.log('\nGhost Profiles (in public.profiles but NOT in auth.users):');
    ghosts.forEach(g => console.log(g.id));

    // Also let's list the auth users emails
    console.log('\nAuth Users:');
    users.forEach(u => console.log(u.id, u.email));
}

checkGhostProfiles();
