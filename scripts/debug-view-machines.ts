import { getVMPayCredentials, VMPAY_API_BASE_URL } from '../lib/vmpay-config';

async function main() {
    const creds = await getVMPayCredentials();
    const cascavel = creds.find(c => c.name.toLowerCase().includes("cascavel"));
    
    if (!cascavel) {
        console.log("No Cascavel credentials");
        return;
    }

    console.log(`Fetching machines for: ${cascavel.name} (CNPJ: ${cascavel.cnpj})`);
    console.log(`API_KEY used: ${cascavel.apiKey}`);

    let res = await fetch(`${VMPAY_API_BASE_URL}/maquinas?pagina=0&quantidade=100`, {
        headers: { 'x-api-key': cascavel.apiKey }
    });

    if (res.ok) {
        const data = await res.json();
        const map = data.map((m: any) => ({
             id: m.id, 
             nome: m.nome, 
             tipo: m.tipo 
        }));
        console.log(`Total machines found: ${map.length}`);
        console.table(map);
    } else {
        console.log("Failed to fetch");
    }
}

main();
