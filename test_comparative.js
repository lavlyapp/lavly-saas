require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.time('Comparative Query Timeout Test');
    const { data, error } = await s.rpc('get_comparative_financial_metrics', {
        p_store: 'Todas',
        p_start_date: '2025-01-01',
        p_end_date: '2026-12-31'
    });
    console.timeEnd('Comparative Query Timeout Test');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success! Data keys:', Object.keys(data));
    }
}

main();
