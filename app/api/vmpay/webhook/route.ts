import { NextResponse } from 'next/server';
import { updateTargetTimeDB } from '@/lib/automation/scheduler';

// Em um ambiente real "serverless", essas variáveis precisariam vir
// de um Banco de Dados ou da Vercel Environment Variables.
// Como estamos num MVP sem DB, vamos simular a leitura do SettingsContext ou Variáveis de Ambiente.
function getAutomationConfig(request: Request, payload?: any) {
    // Tenta ler headers repassados pela simulação OU variaveis reais de ambiente
    const envStatus = request.headers.get('x-sim-status') || process.env.STATUS_AUTOMACAO || 'DESATIVADO';
    const envMinLavagem = parseInt(request.headers.get('x-sim-min-lav') || process.env.MINUTOS_LAVAGEM || '50', 10);
    const envMinSecagem = parseInt(request.headers.get('x-sim-min-sec') || process.env.MINUTOS_SECAGEM || '70', 10);

    // Tuya Credentials & Context
    const deviceId = request.headers.get('x-sim-device') || process.env.DEVICE_ID_TUYA || '';
    const clientId = request.headers.get('x-sim-client-id') || process.env.TUYA_CLIENT_ID || '';
    const clientSecret = request.headers.get('x-sim-client-secret') || process.env.TUYA_CLIENT_SECRET || '';
    const sceneOnId = request.headers.get('x-sim-scene-on') || process.env.TUYA_SCENE_ON || '';
    const sceneOffId = request.headers.get('x-sim-scene-off') || process.env.TUYA_SCENE_OFF || '';

    const cnpj = request.headers.get('x-sim-cnpj') || payload?.cnpj || process.env.VMPAY_CNPJ || '';

    return {
        status: envStatus === 'ATIVADO',
        minLavagem: envMinLavagem,
        minSecagem: envMinSecagem,
        deviceId,
        clientId,
        clientSecret,
        sceneOnId,
        sceneOffId,
        cnpj
    };
}

export async function POST(request: Request) {
    try {
        const payload = await request.json();

        console.log("[VMPay Webhook] 📩 Novo Payload Recebido", payload);

        const config = getAutomationConfig(request, payload);

        if (!config.status) {
            console.log("[VMPay Webhook] 🛑 Automação DESATIVADA no SaaS. Ignorando evento.");
            return NextResponse.json({ message: 'Automação desativada. Evento ignorado.' });
        }

        if (!config.deviceId) {
            console.error("[VMPay Webhook] ⚠️ ID do dispositivo Tuya não configurado.");
            return NextResponse.json({ error: 'Device ID ausente na configuração.' }, { status: 500 });
        }

        // --- EXTRATOR DE SERVIÇO VMPAY ---
        // Exemplo fictício de Payload: { "type": "sale", "serviceName": "LAVAGEM 30 MIN", "machineId": "5120" }
        // Dependerá do Payload real que a VMPay manda no Webhook.
        const serviceName = (payload.serviceName || payload.description || payload.produto || '').toLowerCase();
        const machine = (payload.machine || '').toLowerCase();

        let addedMinutes = 0;

        // Detectar tipo de serviço (Lógica simplificada do CRM)
        const isWash = serviceName.includes('lav') || machine.includes('lav');
        const isDry = serviceName.includes('sec') || machine.includes('sec');

        if (isDry) {
            addedMinutes = config.minSecagem; // Padrão: 70 min
        } else if (isWash) {
            addedMinutes = config.minLavagem; // Padrão: 50 min
        } else {
            console.log(`[VMPay Webhook] Serviço não identificado como Lavagem ou Secagem (${serviceName}). Adicionando tempo mínimo de segurança (Lavagem).`);
            addedMinutes = config.minLavagem;
        }

        // --- CÁLCULO DO NOVO LIMITE ---
        const now = new Date();
        const newTargetTime = new Date(now.getTime() + addedMinutes * 60000);

        console.log(`[VMPay Webhook] 🚀 Serviço: ${isDry ? 'SECAGEM' : 'LAVAGEM'}. Adicionando +${addedMinutes} min.`);

        // --- CHAMA O SCHEDULER ---
        await updateTargetTimeDB(newTargetTime, config.cnpj, config);

        return NextResponse.json({
            success: true,
            message: 'Limites do AC recalculados com sucesso.',
            newTargetTime: newTargetTime.toISOString()
        });

    } catch (error) {
        console.error("[VMPay Webhook] Erro ao processar webhook:", error);
        return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }
}
