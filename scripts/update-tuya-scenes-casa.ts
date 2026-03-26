import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    const storeId = '69e865fb-9a2c-4dc1-8edd-35383be59f10'; // Lavateria Cascavel
    const sceneOnId = 'BDbZ0mCvmFpJJKZ5'; // Liga AR Casa
    const sceneOffId = 'QRKJFIcIwqXh1FAJ'; // Desliga AR Casa

    console.log(`Atualizando loja ${storeId} com novas cenas: ON=${sceneOnId}, OFF=${sceneOffId}...`);

    const { data, error } = await supabaseAdmin
        .from('stores')
        .update({
            tuya_scene_on_id: sceneOnId,
            tuya_scene_off_id: sceneOffId
        })
        .eq('id', storeId)
        .select('name, tuya_scene_on_id, tuya_scene_off_id')
        .single();

    if (error) {
        console.error('Erro ao atualizar banco de dados:', error.message);
        return;
    }

    console.log('✅ Sucesso! Dados atualizados no banco:', data);
}

run();
