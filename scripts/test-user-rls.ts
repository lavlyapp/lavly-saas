import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPolicies() {
    const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'profiles' }).catch(() => ({data: null, error: 'RPC not found'}));
    
    if (error) {
        // Fallback to direct SQL via raw query if REST RPC doesn't exist 
        console.log("Tentando ler pg_settings via SQL Rest API não é possível. Irei gerar o comando para você rodar.");
        console.log(`
        -- Rode isso no SQL Editor do Supabase para consertar a view do Admin:
        
        -- Garante que ADMINS podem ler todos os perfis
        CREATE POLICY "Admins can view all profiles"
            ON public.profiles
            FOR SELECT
            USING (
                (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
            );
        `);
    } else {
        console.log(data);
    }
}
checkPolicies();
