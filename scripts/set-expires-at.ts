import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
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
  
  if (args.length < 2) {
    console.log('\n--- Script para Atualizar Vencimento de Assinatura ---');
    console.log('Uso: npx ts-node scripts/set-expires-at.ts <email> <dias | "vencido">');
    console.log('Exemplo para adicionar 30 dias: npx ts-node scripts/set-expires-at.ts teste@loja.com 30');
    console.log('Exemplo para expirar a conta: npx ts-node scripts/set-expires-at.ts teste@loja.com vencido\n');
    process.exit(1);
  }

  const email = args[0];
  const value = args[1];
  let newExpiresAt: string;

  if (value.toLowerCase() === 'vencido') {
    const date = new Date();
    date.setDate(date.getDate() - 2); // Coloca pra 2 dias atrás
    newExpiresAt = date.toISOString();
  } else {
    const days = parseInt(value, 10);
    if (isNaN(days)) {
      console.error('ERRO: O segundo argumento deve ser o número de dias ou "vencido"');
      process.exit(1);
    }
    const date = new Date();
    date.setDate(date.getDate() + days);
    newExpiresAt = date.toISOString();
  }

  console.log(`Buscando usuário: ${email}`);
  
  // Como podemos ter muitos usuários, a forma garantida é pegar a lista
  // Mas a API admin.listUsers lista todos ou paginado.
  // Uma alternativa para pegar 1 user pelo email em produção.
  // Mas como só usamos pra dev, vamos puxar 500
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
  console.log(`Atualizando expires_at para: ${newExpiresAt}`);

  const { data, error } = await supabase
    .from('profiles')
    .update({ expires_at: newExpiresAt })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar profiles:', error);
    process.exit(1);
  }

  console.log('✅ Sucesso! O perfil foi atualizado com a nova data:');
  console.table({
    id: data.id,
    role: data.role,
    expires_at: data.expires_at
  });
}

main();
