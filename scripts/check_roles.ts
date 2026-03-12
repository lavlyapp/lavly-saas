import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing keys");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching profiles...");
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error("Error fetching:", error);
  } else {
    console.log("PROFILES:");
    data.forEach(p => console.log(`- ID: ${p.id} | Role: ${p.role} | Max Stores: ${p.max_stores} | Email: ${p.email || 'unknown'}`));
  }
}

run();
