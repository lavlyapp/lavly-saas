import { getVMPayCredentials, VMPAY_API_BASE_URL } from '../lib/vmpay-config';

async function main() {
    const creds = await getVMPayCredentials();
    const cred = creds.find(c => c.name.includes('JOQUEI')) || creds[0];
    
    const now = new Date();
    const startStr = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const endStr = now.toISOString();
    
    const url = `${VMPAY_API_BASE_URL}/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=5`;
    const res = await fetch(url, { headers: { 'x-api-key': cred.apiKey } });
    const data = await res.json();
    
    console.log("SALE RAW DATE FIELD:", data[0].data);
    console.log("DTA NASCIMENTO FIELD:", data[0].dtaNascimento);
}

main();
