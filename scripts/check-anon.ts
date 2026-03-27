import { createClient } from '@supabase/supabase-js';

require('dotenv').config({ path: '.env.local' });

const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkAnonRead() {
    const { data, error, count } = await supabaseAnon.from('sales').select('*', { count: 'exact', head: true });
    
    console.log("Anon Read Error:", error?.message);
    console.log("Anon Read Count:", count);
}

checkAnonRead();
