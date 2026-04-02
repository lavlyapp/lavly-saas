require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { getDaysInMonth } = require('date-fns');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRpc() {
    console.log('Testing RPC get_financial_dashboard_metrics...');
    const startTime = Date.now();
    
    // Simulate what the Route does for 'thisMonth' using our new logic
    const nowBrt = new Date(Date.now() - (3 * 3600 * 1000));
    const targetMonthStr = nowBrt.toISOString().substring(0, 7);
    const startIso = `${targetMonthStr}-01T00:00:00.000Z`;
    const daysThisMonth = getDaysInMonth(nowBrt);
    const endIso = `${targetMonthStr}-${String(daysThisMonth).padStart(2, '0')}T23:59:59.999Z`;
    
    console.log('Calculated end bounds:', endIso);

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_financial_dashboard_metrics', {
        p_store: 'Todas',
        p_start_date: startIso,
        p_end_date: endIso
    });

    const elapsed = Date.now() - startTime;
    console.log(`Execution time: ${elapsed}ms`);
    
    if (rpcError) {
        console.error('RPC Error:', rpcError);
    } else {
        console.log('RPC Success! Payload summary:', {
            salesMetrics: rpcData.salesMetrics,
            period: rpcData.period
        });
    }
}

testRpc();
