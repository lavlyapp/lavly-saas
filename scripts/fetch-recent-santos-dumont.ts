import { getVMPayCredentials } from '../lib/vmpay-config';

async function main() {
    console.log("Direct VMPay Fetch: Santos Dumont (12:00 to 15:00 BRT)");

    // Fallback to static credentials just like the cron does
    const credentials = [
        { name: 'Lavateria Cascavel', cnpj: '43660010000166', apiKey: 'e86895ce0ff841f38e4a9042bcae15f6' },
        { name: 'Lavateria SANTOS DUMONT', cnpj: '53261645000144', apiKey: '2bfcbd034ac243169f41b21ee4c6e9a6' }
    ];

    const cred = credentials.find(c => c.name.includes("SANTOS DUMONT"));
    if (!cred) return console.log("Missing config");

    const startStr = "2026-03-01T00:00:00.000"; // March 1st
    const endStr = "2026-03-06T15:00:00.000";   // Now
    const url = `https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=1000`;

    console.log(`Fetching GET ${url}`);

    try {
        const res = await fetch(url, { headers: { 'x-api-key': cred.apiKey } });
        if (!res.ok) {
            const errBody = await res.text();
            console.error(`HTTP Error: ${res.status} - ${errBody}`);
            return;
        }
        const data = await res.json();

        console.log(`Received ${data?.length || 0} recent sales from VMPay.`);
        if (data.length > 0) {
            data.forEach((sale: any) => {
                const item = sale.pedido?.itens?.[0];
                console.log(`> Sale ID: ${sale.idVenda} | Date: ${sale.data} | Machine: ${item?.maquina} | Value: ${sale.valor}`);
            });
        }
    } catch (e: any) {
        console.error("Fetch failed:", e.message);
    }
}
main();
