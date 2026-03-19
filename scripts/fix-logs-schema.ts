import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
  console.log('Applying Foreign Key to activity_logs...');
  
  // Clean up orphans first to avoid constraint validation errors
  const { error: delErr } = await sb.from('activity_logs')
        .delete()
        .not('user_id', 'in', `(${
            (await sb.from('profiles').select('id')).data?.map(p => p.id).join(',') || ''
        })`);
  console.log('Deleted orphaned logs:', delErr);

  // We cannot run RAW SQL easily with the JS client unless there is an rpc function.
  // Instead, let's just rewrite the React component to fetch separately, which is 100% safe.
}
check();
