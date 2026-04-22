import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

async function test() {
    console.log("Testing CRM metrics Edge RPC natively...");
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_crm_backend_metrics', {
        p_store: 'Lavateria Cascavel',
        p_start_date: '2026-04-01T00:00:00.000Z',
        p_end_date: '2026-04-17T23:59:59.000Z'
    });

    console.log(rpcError ? "Error: " + rpcError : "Success: " + (rpcData ? "Has Data" : "No Data"));
}
test();
