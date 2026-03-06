import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getVMPayCredentials } from '../lib/vmpay-config';

async function checkStore(storeNameMatch: string, missingId: string) {
    const creds = await getVMPayCredentials();
    const cred = creds.find(c => c.name.toLowerCase().includes(storeNameMatch.toLowerCase()));

    if (!cred) return;

    // 2. Fetch from VMPay API
    try {
        const url = `${process.env.NEXT_PUBLIC_VMPAY_API_BASE_URL}/vendas?dataInicio=2026-03-06T00:00:00&dataTermino=2026-03-06T23:59:59&somenteSucesso=true&pagina=0&quantidade=1000`;
        const res = await fetch(url, { headers: { 'x-api-key': cred.apiKey } });
        const data = await res.json();

        if (Array.isArray(data)) {
            data.forEach((s: any) => {
                if (String(s.idVenda) === missingId) {
                    console.log(`\n\n--- RAW SALE OBJECT FOR ${missingId} ---`);
                    console.log(JSON.stringify(s, null, 2));
                }
            });
        }
    } catch (e) {
        console.error("[VMPay API] Error:", e);
    }
}

async function run() {
    await checkStore('Joquei', '29578078');
}

run();
