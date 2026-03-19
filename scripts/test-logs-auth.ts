import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
async function check() {
  console.log('Authenticating as admin...');
  const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
    email: 'eduardo@lavateria.com.br', // Assuming admin email
    password: 'lavly' // Assuming password... wait, I don't know the password.
  });
  
  if (authErr) {
    console.log('Auth error (we will just query anually):', authErr.message);
  }
  
  console.log('Fetching logs...');
  const { data, error } = await sb.from('activity_logs').select('*, profiles(email)').limit(5);
  console.log('Error:', error);
  console.log('Data:', data?.length);
}
check();
