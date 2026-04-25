import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // get user by email from auth schema
    const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
    if (uErr) { console.error(uErr); return; }

    const eduardo = users.users.find(u => u.email === 'eduardofbmoura@gmail.com');
    if (!eduardo) {
        console.log("No user found with email eduardofbmoura@gmail.com in auth.users");
        return;
    }

    console.log("Found in auth.users:", eduardo.id, eduardo.email);
    console.log("User Metadata:", eduardo.user_metadata);

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', eduardo.id)
        .single();
    
    if (error) {
        console.error("Error fetching profile for that ID:", error.message);
        return;
    }

    console.log("\nProfile Data:");
    console.log(profile);
}

main();
