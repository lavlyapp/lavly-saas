import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function checkNathalia() {
  const { data, error } = await supabase.from('profiles').select('id, email, role, assigned_stores, vmpay_api_key');
  if (error) console.error(error);
  else console.log(JSON.stringify(data.filter(u => u.email?.toLowerCase().includes('nathalia') || u.role !== 'admin'), null, 2));
}

checkNathalia();
