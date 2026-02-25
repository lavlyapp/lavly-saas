
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase URL or Key missing");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking activity logs...");
    const { data: logs, error: lError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (lError) console.error("Logs Error:", lError);
    else {
        console.log("Recent Logs:", logs.length);
        logs.forEach(l => console.log(`- [${l.created_at}] ${l.action}: ${JSON.stringify(l.details)}`));
    }

    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('email, role');

    if (pError) console.error("Profiles Error:", pError);
    else {
        console.log("Profiles Count:", profiles.length);
        profiles.forEach(p => console.log(`- ${p.email} (Role: ${p.role})`));
    }

    console.log("\nQuerying stores...");
    const { data, error } = await supabase
        .from('stores')
        .select('name, is_active, cnpj');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Count:", data.length);
        data.forEach(s => console.log(`- ${s.name} (Active: ${s.is_active}, CNPJ: ${s.cnpj})`));
    }
}

check();
