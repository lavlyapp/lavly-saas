import { getVMPayCredentials, VMPAY_API_BASE_URL } from '../lib/vmpay-config';

async function main() {
    console.log("Fetching VMPay credentials...");
    const creds = await getVMPayCredentials();
    if (creds.length === 0) {
        console.log("No credentials found.");
        return;
    }
    const cred = creds[0];
    console.log(`Using credential for ${cred.name}...`);
    
    const url = `${VMPAY_API_BASE_URL}/clientes?pagina=0&quantidade=5`;
    console.log(`Fetching from ${url}`);
    
    const res = await fetch(url, { headers: { 'x-api-key': cred.apiKey } });
    if (!res.ok) {
        console.log(`Error: ${res.status} ${res.statusText}`);
        return;
    }
    const data = await res.json();
    console.log(`Received ${data.length} customers.`);
    console.log("Raw JSON of the first customer:", JSON.stringify(data[0], null, 2));
    
    // check if any customer has gender
    let hasGender = 0;
    const urlAll = `${VMPAY_API_BASE_URL}/clientes?pagina=0&quantidade=100`;
    const resAll = await fetch(urlAll, { headers: { 'x-api-key': cred.apiKey } });
    const dataAll = await resAll.json();
    for (const c of dataAll) {
        if (c.genero || c.sexo || c.gender) {
            hasGender++;
        }
    }
    console.log(`Checked 100 customers. Found gender in ${hasGender} payloads.`);
    
    // Also log all the keys present in a regular customer payload
    console.log("Keys available in customer object:", Object.keys(data[0]).join(', '));
}

main().catch(console.error);
