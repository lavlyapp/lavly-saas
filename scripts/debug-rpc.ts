import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    console.log("Calling get_crm_backend_metrics...");
    const { data: rpcData, error } = await supabase.rpc('get_crm_backend_metrics', { p_store: 'Todas' });
    
    if (error) {
        console.error("Error from RPC:", error);
        return;
    }
    
    console.log("Received data from RPC.");
    // Check if globalProfiles has age and birth_date
    if (rpcData && rpcData.globalProfiles && rpcData.globalProfiles.length > 0) {
        console.log("Sample profile:", JSON.stringify(rpcData.globalProfiles[0], null, 2));
        
        let hasAge = 0;
        let hasBirthDate = 0;
        let male = 0, female = 0, u = 0;
        for (const p of rpcData.globalProfiles) {
            if (p.age) hasAge++;
            if (p.birth_date) hasBirthDate++;
            if (p.gender === 'M') male++;
            else if (p.gender === 'F') female++;
            else u++;
        }
        
        console.log(`Out of ${rpcData.globalProfiles.length} profiles:`);
        console.log(`- ${hasAge} have age`);
        console.log(`- ${hasBirthDate} have birth_date`);
        console.log(`- Genders: M (${male}), F (${female}), U (${u})`);
    } else {
        console.log("No global profiles returned.");
    }
}

main().catch(console.error);
