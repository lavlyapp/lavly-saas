require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRpcAllTime() {
    console.log('Testing RPC get_financial_dashboard_metrics for ALL TIME...');
    const startTime = Date.now();
    
    // allTime -> no boundaries (NULL)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_financial_dashboard_metrics', {
        p_store: 'Todas',
        p_start_date: null,
        p_end_date: null
    });

    const elapsed = Date.now() - startTime;
    console.log(`Execution time: ${elapsed}ms`);
    
    if (rpcError) {
        console.error('RPC Error:', rpcError);
    } else {
        console.log('RPC Success! Payload period:', rpcData.period);
        console.log('Total Revenue:', rpcData.salesMetrics.totalRevenue);
        console.log('Total Transactions:', rpcData.salesMetrics.totalTransactions);
    }
}

testRpcAllTime();
