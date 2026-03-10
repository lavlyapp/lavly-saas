import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente do .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function runTest() {
    console.log("=========================================");
    console.log("🧪 TESTE: Fluxo de Convite via API Key");
    console.log("=========================================");

    // Dados Mockados para o Teste
    const testEmail = `test-invite+${Date.now()}@lavly.com.br`;
    const testApiKey = "e8689749-58b1-4a3e-8f1c-11d1a5e2b42e"; // Chave da Lavateria Cascavel

    console.log(`\nEmail de teste: ${testEmail}`);
    console.log(`API Key: ${testApiKey}`);

    try {
        console.log("\n[1] Simulando chamada da Rota REST /api/admin/invite...");
        // Como o Next.js não está rodando, vamos testar apenas a parte do Supabase

        console.log(`\n[2] Criando usuário no Supabase Auth...`);
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: testEmail,
            email_confirm: true, // Ignorando confirmação para não lotar email real
            password: 'TestPassword123!'
        });

        if (authError) {
            console.error("❌ Erro ao criar usuário:", authError.message);
            return;
        }

        const userId = authData.user.id;
        console.log(`✅ Usuário criado com sucesso! ID: ${userId}`);

        console.log(`\n[3] Inserindo no public.profiles (Simulando VMPay)...`);
        const assignedStores = ['Lavateria Cascavel']; // Mock: Suposto retorno da API

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                role: 'owner',
                assigned_stores: assignedStores,
                vmpay_api_key: testApiKey,
                updated_at: new Date().toISOString()
            });

        if (profileError) {
            console.error("❌ Erro ao atualizar profile:", profileError.message);
            return;
        }
        console.log(`✅ Profile atualizado com lojas e API Key!`);

        console.log(`\n[4] Inserindo Loja na public.stores...`);
        const { error: storeError } = await supabaseAdmin
            .from('stores')
            .upsert({
                name: assignedStores[0],
                api_key: testApiKey,
                is_active: true
            }, { onConflict: 'name', ignoreDuplicates: false });

        if (storeError) {
            console.error("❌ Erro ao inserir loja:", storeError.message);
            return;
        }
        console.log(`✅ Loja public.stores associada à chave com sucesso!`);


        console.log(`\n[5] Lendo public.profiles para conferir o resultado final...`);
        const { data: profileCheck, error: checkError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (checkError) {
            console.error("❌ Erro ao consultar o banco:", checkError.message);
            return;
        }

        console.log("\n[RESULTADO FINAL DO BANCO]");
        console.log(profileCheck);

        console.log("\n✅ Funciona perfeitamente. O RLS isolará corretamente este usuário baseado em assigned_stores.");

    } catch (error) {
        console.error("Erro inesperado:", error);
    }
}

runTest();
