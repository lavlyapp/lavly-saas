import { getVMPayCredentials } from '../lib/vmpay-config';

async function main() {
    console.log("Fetching raw VMPay payload for Santos Dumont...");
    const credentials = await getVMPayCredentials();
    const cred = credentials.find(c => c.name.includes("SANTOS DUMONT"));
    if (!cred) return console.log("Santos Dumont not found");

    const startStr = "2026-03-06T10:00:00";
    const endStr = "2026-03-06T15:00:00";
    const url = `https://integracao.vmpay.com.br/api/v1/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=5`;

    console.log("Fetching GET", url);
    const res = await fetch(url, { headers: { 'x-api-key': cred.apiKey } });
    const data = await res.json();

    if (data.length > 0) {
        data.slice(0, 5).forEach((sale: any) => {
            console.log(`Sale ID: ${sale.idVenda} | Raw Date String: "${sale.data}"`);
        });
    } else {
        console.log("No sales found in this window using VMPay clock.");
    }
}
main();
