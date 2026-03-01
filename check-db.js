require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function check() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data, error } = await supabase.from('customers').select('id').limit(1);
    if (error) {
        console.log("Error querying customers:", error.message);
    } else {
        console.log("Customers table EXISTS. Data length:", data.length);
    }
}
check();
