import { getVMPayCredentials, VMPAY_API_BASE_URL } from '../lib/vmpay-config';

async function main() {
    const creds = await getVMPayCredentials();
    const cred = creds.find(c => c.name.includes('SOLARES'));
    if (!cred) { console.error("Solares not found"); return; }
    
    // Fetch sales for TODAY (March 23) in BRT
    const startStr = "2026-03-23T00:00:00-03:00";
    const endStr = "2026-03-23T23:59:59-03:00";
    
    const url = `${VMPAY_API_BASE_URL}/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=0&quantidade=100`;
    const res = await fetch(url, { headers: { 'x-api-key': cred.apiKey } });
    const data = await res.json();
    
    console.log(`VMPay Raw Sales fetched for Solares: ${data.length}`);
    
    let totalItemsFoundInArray = 0;
    
    data.forEach((sale: any, idx: number) => {
        const hasItens = sale.pedido?.itens && Array.isArray(sale.pedido.itens);
        const numItems = hasItens ? sale.pedido.itens.length : 0;
        
        console.log(`\nSale [${idx+1}] ID ${sale.idVenda} | Valor: ${sale.valor} | Equip: ${sale.equipamento}`);
        if (!hasItens) {
            console.log(`  -> NO 'itens' array! Fallback creates 1 item for equipment ${sale.equipamento}`);
            totalItemsFoundInArray += 1;
        } else {
            console.log(`  -> 'itens' array has ${numItems} entries:`);
            sale.pedido.itens.forEach((i: any) => {
                console.log(`       - Maq: ${i.maquina}, Servico: ${i.tipoServico}, Valor: ${i.valor}`);
                totalItemsFoundInArray += 1;
            });
        }
    });
    
    console.log(`\nIf Lavly parses every item object exactly once...`);
    console.log(`Total Cestos mathematically processed by VMPay Array: ${totalItemsFoundInArray}`);
    console.log(`VMPay Dashboard officially reports: 24 ciclos.`);
}

main();
