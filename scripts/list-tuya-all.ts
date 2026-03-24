import crypto from 'crypto';

const config = {
    clientId: 'xrcf7xpuvwjkfd5kn48m',
    clientSecret: 'd65cd79efc7f49489664e92a37042afe',
    uid: 'az17716881585717gckM' // Recovered from last scan
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

async function request(url: string, method: string, accessToken: string) {
    const t = Date.now().toString();
    const cmdHash = crypto.createHash('sha256').update('').digest('hex');
    const strToSignReq = `${method}\n${cmdHash}\n\n${url}`;
    const sign = crypto.createHmac('sha256', config.clientSecret).update(config.clientId + accessToken + t + strToSignReq).digest('hex').toUpperCase();

    const res = await fetch(baseUrl + url, {
        method,
        headers: {
            'client_id': config.clientId,
            'access_token': accessToken,
            'sign': sign,
            't': t,
            'sign_method': 'HMAC-SHA256',
        }
    });
    return res.json();
}

async function main() {
    console.log("=== INICIANDO VARREDURA COMPLETA DA NUVEM TUYA ===");
    const tokenData = await getToken();
    if (!tokenData.success) {
        console.error("Falha na autenticação:", tokenData);
        return;
    }
    const accessToken = tokenData.result.access_token;

    // 1. Devices
    console.log(`\n📲 PROCURANDO APARELHOS...`);
    const devData = await request(`/v1.0/users/${config.uid}/devices`, 'GET', accessToken);
    if (!devData.success) console.error("Falha ao buscar aparelhos:", devData);
    else {
        devData.result.forEach((d: any) => {
            console.log(`   🔸 [${d.is_online ? 'ONLINE' : 'OFFLINE'}] Produto: "${d.name}" | ID: ${d.id}`);
        });
    }

    // 2. Homes
    console.log(`\n🏠 PROCURANDO CENAS "Tap-To-Run"...`);
    const homesData = await request(`/v1.0/users/${config.uid}/homes`, 'GET', accessToken);
    if (homesData.success) {
        for (const home of homesData.result) {
            const scenesData = await request(`/v1.0/homes/${home.home_id}/scenes`, 'GET', accessToken);
            if (scenesData.success && scenesData.result.length > 0) {
                console.log(`   [Casa: ${home.name}]`);
                scenesData.result.forEach((s: any) => {
                    console.log(`      -> Nome: "${s.name}" | ID da Cena: ${s.scene_id}`);
                });
            }
        }
    }
}
main();
