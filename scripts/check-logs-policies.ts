import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
  const { data, error } = await sb.rpc('exec_sql', { sql: "SELECT * FROM pg_policies WHERE tablename = 'activity_logs'" }).catch(e=>({data:null, error:e}));
  if (error || !data) {
     // fallback if rpc 'exec_sql' doesn't exist
     const q = await sb.from('activity_logs').select('*').limit(1);
     console.log('Query raw:', q);
     return;
  }
  console.log('Policies:', data);
}
check();
