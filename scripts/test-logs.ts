import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
  console.log('Fetching logs...');
  const { data, error } = await sb.from('activity_logs').select('*, profiles(email)').limit(5);
  console.log('Error:', error);
  console.log('Data count:', data?.length);
  console.log('First:', data?.[0]);
}
check();
