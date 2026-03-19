import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
  const { data, error } = await sb.from('profiles').select('status').limit(1);
  if (error) console.log('ERROR:', error);
  else console.log('DATA:', data);
}
check();
