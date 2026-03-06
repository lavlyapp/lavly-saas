const https = require('https');

const startStr = "2026-03-06T12:00:00";
const endStr = "2026-03-06T15:00:00";
const url = `https://integracao.vmpay.com.br/api/v1/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=100`;

console.log(`Direct HTTPS GET ${url}`);

https.get(url, { headers: { 'x-api-key': '2bfcbd034ac243169f41b21ee4c6e9a6' } }, (res: any) => {
    let raw = '';
    res.on('data', (c: string) => raw += c);
    res.on('end', () => {
        try {
            const data = JSON.parse(raw);
            console.log(`Received ${data.length || 0} recent sales from VMPay.`);
            if (data.length > 0) {
                data.forEach((sale: any) => {
                    const item = sale.pedido?.itens?.[0];
                    console.log(`> Sale ID: ${sale.idVenda} | Date: ${sale.data} | Machine: ${item?.maquina} | Value: ${sale.valor}`);
                });
            }
        } catch (e: any) {
            console.log("Parse Error", e.message);
        }
    });
}).on('error', (e: any) => {
    console.error("Native HTTPS Error:", e.message);
});
