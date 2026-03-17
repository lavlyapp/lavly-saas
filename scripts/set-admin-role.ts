import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERRO: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('\n--- Script para Atualizar Role para ADMIN ---');
    console.log('Uso: npx ts-node scripts/set-admin-role.ts <email>');
    console.log('Exemplo: npx ts-node scripts/set-admin-role.ts lavlyapp@gmail.com\n');
    process.exit(1);
  }

  const email = args[0];

  console.log(`Buscando usuário: ${email}`);
  
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  
  if (listError) {
    console.error('Erro ao listar usuários do Auth:', listError);
    process.exit(1);
  }

  const user = usersData.users.find(u => u.email === email);

  if (!user) {
    console.error(`ERRO: Usuário com email ${email} não encontrado.`);
    process.exit(1);
  }

  console.log(`Usuário encontrado. ID: ${user.id}`);
  console.log(`Atualizando role para 'admin'`);

  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar profiles:', error);
    process.exit(1);
  }

  console.log('✅ Sucesso! O perfil foi atualizado para admin:');
  console.table({
    id: data.id,
    role: data.role,
    expires_at: data.expires_at
  });
}

main();
