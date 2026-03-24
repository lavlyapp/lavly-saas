import crypto from 'crypto';

const config = {
    clientId: 'xrcf7xpuvwjkfd5kn48m',
    clientSecret: 'd65cd79efc7f49489664e92a37042afe',
    deviceId: 'eb0d7b0b9fa30e5de83kly'
};

const baseUrl = 'https://openapi.tuyaus.com';

async function getToken() {
    const tokenT = Date.now().toString();
    const signUrl = '/v1.0/token?grant_type=1';
    const contentHash = crypto.createHash('sha256').update('').digest('hex');
    const tokenStrToSignReq = `GET\n${contentHash}\n\n${signUrl}`;
    const tokenSign = crypto.createHmac('sha256', config.clientSecret).update(config.clientId + tokenT + tokenStrToSignReq).digest('hex').toUpperCase();

    const res = await fetch(baseUrl + signUrl, {
        method: 'GET',
        headers: {
            'client_id': config.clientId,
            'sign': tokenSign,
            't': tokenT,
            'sign_method': 'HMAC-SHA256'
        }
    });
    return res.json();
}

async function request(url: string, method: string, accessToken: string, bodyObj?: any) {
    const t = Date.now().toString();
    const bodyStr = bodyObj ? JSON.stringify(bodyObj) : '';
    const cmdHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
    const strToSignReq = `${method}\n${cmdHash}\n\n${url}`;
    const sign = crypto.createHmac('sha256', config.clientSecret).update(config.clientId + accessToken + t + strToSignReq).digest('hex').toUpperCase();

    const headers: any = {
        'client_id': config.clientId,
        'access_token': accessToken,
        'sign': sign,
        't': t,
        'sign_method': 'HMAC-SHA256',
    };
    if (bodyObj) headers['Content-Type'] = 'application/json';

    const res = await fetch(baseUrl + url, { method, headers, body: bodyObj ? bodyStr : undefined });
    return res.json();
}

async function main() {
    console.log("=== INICIANDO DESCOBERTA DE CENAS DA TUYA ===");
    const tokenData = await getToken();
    if (!tokenData.success) return console.error("Falha no token:", tokenData);
    const accessToken = tokenData.result.access_token;
    
    // 1. Get Device Details to find UID
    console.log("1. Buscando dados do dispositivo IR...");
    const devData = await request(`/v1.0/devices/${config.deviceId}`, 'GET', accessToken);
    if (!devData.success) return console.error("Falha no device:", devData);
    const uid = devData.result.uid;
    console.log(`✅ UID do proprietário encontrado: ${uid}`);

    // 2. Get User's Homes
    console.log("2. Buscando Casas (Homes) do usuário...");
    const homesData = await request(`/v1.0/users/${uid}/homes`, 'GET', accessToken);
    if (!homesData.success) return console.error("Falha nas homes:", homesData);
    
    // 3. Get Scenes for each Home
    for (const home of homesData.result) {
        console.log(`✅ Casa: ${home.name} (ID: ${home.home_id})`);
        const scenesData = await request(`/v1.0/homes/${home.home_id}/scenes`, 'GET', accessToken);
        if (scenesData.success && scenesData.result.length > 0) {
            console.log(`   🔸 Cenas Inteligentes (Tap-To-Run) encontradas:`);
            scenesData.result.forEach((s: any) => {
                console.log(`      -> Nome: "${s.name}" | ID: ${s.scene_id}`);
            });
        } else {
            console.log(`   🔸 Nenhuma Cena (Tap-To-Run) encontrada nesta casa.`);
        }
    }
}
main();
