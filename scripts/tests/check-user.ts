import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    const email = 'efbminvest@gmail.com';
    console.log(`Buscando dados de: ${email}...`);

    // 1. Check Auth Users
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
        console.error('Erro ao listar usuários auth:', usersError);
        return;
    }

    const authUser = usersData.users.find(u => u.email === email);
    if (!authUser) {
        console.log('Usuário NÃO existe na tabela de autenticação (auth.users).');
        return;
    }

    console.log(`[AUTH] Encontrado! ID: ${authUser.id}, Criado em: ${authUser.created_at}`);

    // 2. Check Profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (profile) {
        console.log(`[PROFILE] Role: ${profile.role}`);
        console.log(`[PROFILE] Lojas Atribuídas:`, profile.assigned_stores);
        console.log(`[PROFILE] Chave VMPay vinculada:`, profile.vmpay_api_key ? 'SIM' : 'NÃO');
    } else {
        console.log(`[PROFILE] Perfil não encontrado na tabela public.profiles!`);
    }
}

checkUser();
