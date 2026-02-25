/**
 * Tuya / Intelbras Smart Integration for VMPay SaaS
 * Note: This module currently MOCKS the actual HTTP requests since real IoT credentials
 * (Client ID, Secret, Device ID) need to be supplied by the user.
 */

import crypto from 'crypto';

interface TuyaConfig {
    deviceId: string | null;
    clientId?: string;
    clientSecret?: string;
    sceneOnId?: string;
    sceneOffId?: string;
}

export async function setAcState(turnOn: boolean, config: TuyaConfig): Promise<boolean> {
    const sceneId = turnOn ? config.sceneOnId : config.sceneOffId;
    const isSceneDir = !!sceneId;
    const targetId = isSceneDir ? sceneId : config.deviceId;

    if (!targetId) {
        console.error("[Tuya API] Erro: Sem ID de Cena e sem ID de Device para envio do comando.");
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const commandValue = turnOn ? true : false;
    console.log(`[Tuya API] 📡 Enviando comando para o Ar-Condicionado (Target: ${targetId}):`);
    console.log(`[Tuya API] 👉 Ação: ${turnOn ? 'LIGAR (Scene/Switch)' : 'DESLIGAR (Scene/Switch)'}`);

    try {
        if (!config.clientId || !config.clientSecret) {
            console.error("[Tuya API] Erro: Tuya Credentials (clientId/secret) ausentes.");
            return false;
        }

        // 1. Get Token
        const tokenT = Date.now().toString();
        const signUrl = '/v1.0/token?grant_type=1';
        const contentHash = crypto.createHash('sha256').update('').digest('hex');
        const tokenStrToSignReq = `GET\n${contentHash}\n\n${signUrl}`;
        const tokenSign = crypto.createHmac('sha256', config.clientSecret).update(config.clientId + tokenT + tokenStrToSignReq).digest('hex').toUpperCase();

        const tokenRes = await fetch(`https://openapi.tuyaus.com${signUrl}`, {
            method: 'GET',
            headers: {
                'client_id': config.clientId,
                'sign': tokenSign,
                't': tokenT,
                'sign_method': 'HMAC-SHA256'
            }
        });
        const tokenData = await tokenRes.json();

        if (!tokenData.success) {
            console.error("[Tuya API] Falha ao obter token:", tokenData);
            return false;
        }
        const accessToken = tokenData.result.access_token;

        // 2. Determine Action (Scene or Standard)
        const sceneId = turnOn ? config.sceneOnId : config.sceneOffId;
        const isScene = !!sceneId;
        const targetId = isScene ? sceneId : config.deviceId;

        if (!targetId) {
            console.error("[Tuya API] Erro: Sem ID de Cena e sem ID de Device fallback para envio do comando.");
            return false;
        }

        let targetUrl = `/v1.0/iot-03/devices/${targetId}/commands`;
        let bodyContent = '';

        if (isScene) {
            targetUrl = `/v1.0/homes/287456895/scenes/${targetId}/trigger`;
            bodyContent = JSON.stringify({});
        } else {
            // Fallback Genérico (Para Tomadas Inteligentes, etc)
            bodyContent = JSON.stringify({
                commands: [{ code: 'power', value: turnOn }]
            });
        }

        // 3. Send Request
        const t = Date.now().toString();
        const cmdHash = crypto.createHash('sha256').update(bodyContent).digest('hex');
        const strToSignReq = `POST\n${cmdHash}\n\n${targetUrl}`;
        const sign = crypto.createHmac('sha256', config.clientSecret).update(config.clientId + accessToken + t + strToSignReq).digest('hex').toUpperCase();

        const res = await fetch(`https://openapi.tuyaus.com${targetUrl}`, {
            method: 'POST',
            headers: {
                'client_id': config.clientId,
                'access_token': accessToken,
                'sign': sign,
                't': t,
                'sign_method': 'HMAC-SHA256',
                'Content-Type': 'application/json'
            },
            body: bodyContent
        });

        const data = await res.json();

        if (data.success) {
            console.log(`[Tuya API] ✅ Comando executado com sucesso nas Nuvens da Tuya!`);
            return true;
        } else {
            console.error(`[Tuya API] ❌ Falha da Tuya:`, data);
            return false;
        }

    } catch (error) {
        console.error("[Tuya API] Falha de Comunicação:", error);
        return false;
    }
}
