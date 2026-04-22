import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getVMPayCredentials, VMPAY_API_BASE_URL } from '../lib/vmpay-config';

async function main() {
    const creds = await getVMPayCredentials();
    const cascavel = creds.find(c => c.name.toLowerCase().includes("cascavel"));
    
    // Fetch last 10 sales
    const startStr = "2026-04-16T00:00:00Z";
    const endStr = "2026-04-17T23:59:59Z";
    let res = await fetch(`${VMPAY_API_BASE_URL}/vendas?dataInicio=${startStr}&dataTermino=${endStr}&pagina=0&quantidade=10`, {
        headers: { 'x-api-key': cascavel?.apiKey! }
    });

    if (res.ok) {
        const data = await res.json();
        console.log(`Raw date from VMPay 1: ${data[0]?.data}`);
        console.log(`Raw date from VMPay 2: ${data[1]?.data}`);
    } else {
        console.log("Failed to fetch", res.status, await res.text());
    }
}

main();
