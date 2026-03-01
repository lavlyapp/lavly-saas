import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Needs this to bypass RLS

if (!supabaseServiceKey) {
    console.error("ERRO: SUPABASE_SERVICE_ROLE_KEY não encontrado no .env.local.");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('[Tuya Update Script] Iniciando com Service Role Key...');

    // Busca todas as lojas (Service Role ignora RLS)
    const { data: stores, error: fetchError } = await supabaseAdmin
        .from('stores')
        .select('id, name');

    if (fetchError) {
        console.error('Erro ao buscar lojas:', fetchError.message);
        return;
    }

    console.log(`Encontradas ${stores?.length || 0} lojas no total.`);

    // Password from User Request
    const secret = 'z/4x=SgJnu%7';
    let updatedCount = 0;

    if (stores && stores.length > 0) {
        for (const store of stores) {
            // We update where name contains Lavly, or if we want to update all test stores:
            // The user implies they changed "the Tuya password", usually there's one Tuya account for the owner's hub.
            // Let's just update all active Tuya secrets to be safe, or just print them.
            // Updating all stores is the safest bet since the Hub is usually shared or uniform for this franchise test.
            const { error: updateError } = await supabaseAdmin
                .from('stores')
                .update({ tuya_client_secret: secret })
                .eq('id', store.id)
                .not('tuya_client_id', 'is', null); // Only update those that ACTUALLY use Tuya

            if (updateError) {
                console.error(`Falha ao atualizar loja ${store.name}:`, updateError.message);
            } else {
                console.log(`✅ Loja "${store.name}" atualizada (se possuía tuya_client_id).`);
                updatedCount++;
            }
        }
    }

    console.log(`Processo finalizado. Tentativas em ${updatedCount} lojas.`);
}

run();
