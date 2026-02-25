import { setAcState } from './tuya';
import { supabase } from '../supabase';

/**
 * Recalcula o horário de desligamento seguindo a regra da MAIOR DURAÇÃO.
 * @param newTargetTime O novo limite de horário sugerido pela venda recente
 * @param config Objeto contendo credenciais e IDs da Tuya
 */
export async function updateTargetTimeDB(newTargetTime: Date, cnpj: string, config: any) {
    // Fetch current state from DB
    const { data: store } = await supabase
        .from('stores')
        .select('ac_turn_off_at')
        .eq('cnpj', cnpj)
        .single();

    let currentLimit = store?.ac_turn_off_at ? new Date(store.ac_turn_off_at) : null;
    const now = new Date();

    if (currentLimit && currentLimit <= now) {
        currentLimit = null;
    }

    if (!currentLimit || newTargetTime > currentLimit) {
        console.log(`[Tuya Scheduler] ⏰ Atualizando limite de desligamento para ${cnpj}: ${newTargetTime.toLocaleTimeString()}`);

        await supabase
            .from('stores')
            .update({ ac_turn_off_at: newTargetTime.toISOString() })
            .eq('cnpj', cnpj);
    }

    // Sempre envia o comando de LIGAR para garantir que a máquina está ligada (idempotente)
    await setAcState(true, {
        deviceId: config.tuyaDeviceId || config.deviceId,
        clientId: config.tuyaClientId || config.clientId,
        clientSecret: config.tuyaClientSecret || config.clientSecret,
        sceneOnId: config.tuyaSceneOnId || config.sceneOnId,
        sceneOffId: config.tuyaSceneOffId || config.sceneOffId
    });
}

/**
 * Verifica se já passou do horário de desligar para todas as lojas e executa o comando.
 */
export async function checkAndTurnOffAll() {
    const now = new Date().toISOString();

    // Fetch stores where AC should be turned OFF
    const { data: stores } = await supabase
        .from('stores')
        .select('*')
        .not('ac_turn_off_at', 'is', null)
        .lte('ac_turn_off_at', now);

    if (!stores || stores.length === 0) return;

    for (const store of stores) {
        console.log(`[Tuya Scheduler] 🛑 Horário limite alcançado para ${store.name}. Desligando AC...`);

        const success = await setAcState(false, {
            deviceId: store.tuya_device_id,
            clientId: store.tuya_client_id,
            clientSecret: store.tuya_client_secret,
            sceneOnId: store.tuya_scene_on_id,
            sceneOffId: store.tuya_scene_off_id
        });

        if (success) {
            await supabase
                .from('stores')
                .update({ ac_turn_off_at: null })
                .eq('id', store.id);
        }
    }
}
