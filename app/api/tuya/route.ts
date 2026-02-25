import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Replicates the Tuya OAuth 2.0 / Token Generation API flow
// Sign method: HMAC-SHA256

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const deviceId = searchParams.get('deviceId');
    const hubId = searchParams.get('hubId');

    const clientId = request.headers.get('x-tuya-id');
    const clientSecret = request.headers.get('x-tuya-secret');

    if (!clientId || !clientSecret || !deviceId) {
        return NextResponse.json({ success: false, error: 'Credenciais ausentes.' }, { status: 400 });
    }

    try {
        // Step 1: Get Access Token
        // API path for token is /v1.0/token?grant_type=1
        const timestamp = Date.now().toString();
        const signUrl = '/v1.0/token?grant_type=1';

        // For Token generation, stringToSign is: clientId + t + nonce + stringToSign
        // simplified stringToSign for token is just the HTTP method + \n + Content-SHA256 + \n + Headers \n + Url
        const contentHash = crypto.createHash('sha256').update('').digest('hex');
        const stringToSignReq = `GET\n${contentHash}\n\n${signUrl}`;
        const strToSign = clientId + timestamp + stringToSignReq;

        const sign = crypto.createHmac('sha256', clientSecret).update(strToSign).digest('hex').toUpperCase();

        const tokenParams = {
            method: 'GET',
            headers: {
                'client_id': clientId,
                'sign': sign,
                't': timestamp,
                'sign_method': 'HMAC-SHA256',
            }
        };

        // We use Tuya's US data center as per user's screenshot (openapi.tuyaus.com)
        const tokenRes = await fetch('https://openapi.tuyaus.com/v1.0/token?grant_type=1', tokenParams);
        const tokenData = await tokenRes.json();

        if (!tokenData.success) {
            return NextResponse.json({ success: false, error: 'Falha de Autenticação na Tuya.', details: tokenData }, { status: 401 });
        }

        const accessToken = tokenData.result.access_token;

        // Step 2: Perform the requested Action
        if (action === 'status') {
            // GET Device Info (detailed)
            // Path: /v1.0/devices/{device_id}
            const stateTimestamp = Date.now().toString();
            const stateUrl = `/v1.0/devices/${deviceId}`;

            // For business requests, stringToSign is: clientId + access_token + t + stringToSign
            const stateHash = crypto.createHash('sha256').update('').digest('hex');
            const stateStrToSignReq = `GET\n${stateHash}\n\n${stateUrl}`;
            const stateStrToSign = clientId + accessToken + stateTimestamp + stateStrToSignReq;

            const stateSign = crypto.createHmac('sha256', clientSecret).update(stateStrToSign).digest('hex').toUpperCase();

            const stateRes = await fetch(`https://openapi.tuyaus.com${stateUrl}`, {
                method: 'GET',
                headers: {
                    'client_id': clientId,
                    'access_token': accessToken,
                    'sign': stateSign,
                    't': stateTimestamp,
                    'sign_method': 'HMAC-SHA256',
                }
            });

            const stateData = await stateRes.json();
            return NextResponse.json({ success: stateData.success, result: stateData.result, raw: stateData });
        }

        if (action === 'specifications') {
            const specTimestamp = Date.now().toString();
            const specUrl = `/v1.0/devices/${deviceId}/specifications`;
            const specHash = crypto.createHash('sha256').update('').digest('hex');
            const specStrToSignReq = `GET\n${specHash}\n\n${specUrl}`;
            const specStrToSign = clientId + accessToken + specTimestamp + specStrToSignReq;
            const specSign = crypto.createHmac('sha256', clientSecret).update(specStrToSign).digest('hex').toUpperCase();

            const specRes = await fetch(`https://openapi.tuyaus.com${specUrl}`, {
                method: 'GET',
                headers: {
                    'client_id': clientId,
                    'access_token': accessToken,
                    'sign': specSign,
                    't': specTimestamp,
                    'sign_method': 'HMAC-SHA256',
                }
            });

            const specData = await specRes.json();
            return NextResponse.json({ success: specData.success, result: specData.result, raw: specData });
        }

        return NextResponse.json({ success: false, error: 'Ação não suportada no GET.' }, { status: 400 });

    } catch (e: any) {
        console.error('Tuya API Error:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const deviceId = searchParams.get('deviceId');
    const hubId = searchParams.get('hubId');
    const isScene = searchParams.get('isScene') === 'true';
    const cmd = searchParams.get('cmd'); // 'ON' or 'OFF'

    const clientId = request.headers.get('x-tuya-id');
    const clientSecret = request.headers.get('x-tuya-secret');

    if (!clientId || !clientSecret || !deviceId || (action !== 'command' && action !== 'test_cmd') || !cmd) {
        return NextResponse.json({ success: false, error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    try {
        // Step 1: Get Access Token
        const timestamp = Date.now().toString();
        const signUrl = '/v1.0/token?grant_type=1';
        const contentHash = crypto.createHash('sha256').update('').digest('hex');
        const stringToSignReq = `GET\n${contentHash}\n\n${signUrl}`;
        const strToSign = clientId + timestamp + stringToSignReq;
        const sign = crypto.createHmac('sha256', clientSecret).update(strToSign).digest('hex').toUpperCase();

        const tokenRes = await fetch('https://openapi.tuyaus.com/v1.0/token?grant_type=1', {
            method: 'GET',
            headers: {
                'client_id': clientId,
                'sign': sign,
                't': timestamp,
                'sign_method': 'HMAC-SHA256',
            }
        });
        const tokenData = await tokenRes.json();

        if (!tokenData.success) {
            return NextResponse.json({ success: false, error: 'Falha de Autenticação na Tuya.' }, { status: 401 });
        }

        const accessToken = tokenData.result.access_token;

        if (action === 'test_cmd') {
            const payload = JSON.parse(cmd); // cmd will carry the raw JSON payload
            const testUrl = `/v1.0/iot-03/devices/${deviceId}/commands`;
            const testTimestamp = Date.now().toString();
            const testHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
            const testStrToSignReq = `POST\n${testHash}\n\n${testUrl}`;
            const testStrToSign = clientId + accessToken + testTimestamp + testStrToSignReq;
            const testSign = crypto.createHmac('sha256', clientSecret).update(testStrToSign).digest('hex').toUpperCase();

            const testRes = await fetch(`https://openapi.tuyaus.com${testUrl}`, {
                method: 'POST',
                headers: {
                    'client_id': clientId,
                    'access_token': accessToken,
                    'sign': testSign,
                    't': testTimestamp,
                    'sign_method': 'HMAC-SHA256',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const testData = await testRes.json();
            return NextResponse.json({ success: testData.success, result: testData.result, raw: testData });
        }

        let targetUrl = `/v1.0/iot-03/devices/${deviceId}/commands`;
        let bodyContent = '';

        if (isScene) {
            // Direct Tuya Scene Execution (Tap-to-Run)
            // deviceId in this context is actually the sceneId.
            // Using the user's primary Home ID (287456895) mapped to Lavly.
            targetUrl = `/v1.0/homes/287456895/scenes/${deviceId}/trigger`;
            bodyContent = JSON.stringify({}); // empty body for trigger
        } else {
            // Step 2: Determine if this is a standard device or an IR Hub by fetching its info first
            const infoUrl = `/v1.0/devices/${deviceId}`;
            const infoTimestamp = Date.now().toString();
            const infoHash = crypto.createHash('sha256').update('').digest('hex');
            const infoStrToSignReq = `GET\n${infoHash}\n\n${infoUrl}`;
            const infoStrToSign = clientId + accessToken + infoTimestamp + infoStrToSignReq;
            const infoSign = crypto.createHmac('sha256', clientSecret).update(infoStrToSign).digest('hex').toUpperCase();

            const infoRes = await fetch(`https://openapi.tuyaus.com${infoUrl}`, {
                method: 'GET',
                headers: {
                    'client_id': clientId,
                    'access_token': accessToken,
                    'sign': infoSign,
                    't': infoTimestamp,
                    'sign_method': 'HMAC-SHA256',
                }
            });
            const infoData = await infoRes.json();

            if (!infoData.success) {
                return NextResponse.json({ success: false, error: 'Falha ao obter info do dispositivo.' }, { status: 400 });
            }

            const category = infoData.result.category;

            if (category === 'infrared_ac') {
                // Ar Condicionado IR expects a FULL payload array to trigger the physical blast,
                if (cmd === 'ON') {
                    bodyContent = JSON.stringify({
                        commands: [
                            { code: 'PowerOn', value: 'PowerOn' },
                            { code: 'T', value: 24 }, // Set to 24 Celsius
                            { code: 'M', value: 0 },  // Cool mode
                            { code: 'F', value: 0 }   // Auto Fan
                        ]
                    });
                } else {
                    bodyContent = JSON.stringify({
                        commands: [
                            { code: 'PowerOff', value: 'PowerOff' }
                        ]
                    });
                }
            } else if (category === 'wnykq') {
                return NextResponse.json({ success: false, error: 'O ID informado pertence ao Hub IR. Por favor, insira o ID do aparelho de Ar Condicionado virtual.' }, { status: 400 });
            } else {
                // Standard switch payload
                bodyContent = JSON.stringify({
                    commands: [{ code: 'power', value: cmd === 'ON' }]
                });
            }
        }

        // Step 3: Send Command
        const stateTimestamp = Date.now().toString();
        const cmdHash = crypto.createHash('sha256').update(bodyContent).digest('hex');
        const stateStrToSignReq = `POST\n${cmdHash}\n\n${targetUrl}`;
        const stateStrToSign = clientId + accessToken + stateTimestamp + stateStrToSignReq;

        const stateSign = crypto.createHmac('sha256', clientSecret).update(stateStrToSign).digest('hex').toUpperCase();

        const cmdRes = await fetch(`https://openapi.tuyaus.com${targetUrl}`, {
            method: 'POST',
            headers: {
                'client_id': clientId,
                'access_token': accessToken,
                'sign': stateSign,
                't': stateTimestamp,
                'sign_method': 'HMAC-SHA256',
                'Content-Type': 'application/json'
            },
            body: bodyContent
        });

        const cmdData = await cmdRes.json();
        return NextResponse.json({ success: cmdData.success, result: cmdData.result, raw: cmdData });

    } catch (e: any) {
        console.error('Tuya API Error:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
