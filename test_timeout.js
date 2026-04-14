require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.time('CRM Query Timeout Test');
    const { data, error } = await s.rpc('get_crm_backend_metrics', {
        p_store: 'Todas'
    });
    console.timeEnd('CRM Query Timeout Test');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success! Data keys:', Object.keys(data));
        console.log('Total global profiles:', data.globalProfiles?.length);
    }
}

main();
