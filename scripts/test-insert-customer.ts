import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Simulate frontend
);

async function testInsert() {
    console.log("Attempting to insert dummy customer with anon key...");
    const { data: authData } = await supabase.auth.getSession();
    console.log("Has auth session:", !!authData?.session); // Probably false in this script

    const payload = {
        name: "TESTE GENDER RLS " + Date.now(),
        gender: "U"
    };

    const { data, error } = await supabase.from('customers').insert([payload]).select();

    if (error) {
        console.error("❌ INSERT FAILED (RLS blocked it?):", error.message);
    } else {
        console.log("✅ INSERT SUCCEEDED:", data);
    }
}

testInsert();
