const url = "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas?dataInicio=2026-03-14T00:00:00&dataTermino=2026-03-14T23:59:59&somenteSucesso=true&quantidade=1000";
const apiKey = "e86895c1-eeb7-4ebc-b3a6-5faac6b940e4"; // cascavel test

fetch(url, { headers: { 'x-api-key': apiKey } })
    .then(r => r.json())
    .then(data => {
        let totalVal = 0;
        let pixVal = 0;
        let credVal = 0;
        let debVal = 0;
        let voucherVal = 0;
        
        const content = data.content || [];
        console.log(`API returned ${content.length} items`);
        
        content.forEach(s => {
            totalVal += s.valor;
            const fp = (s.formaPagamento || "outros").toLowerCase();
            if(fp.includes('pix')) pixVal += s.valor;
            else if(fp.includes('credito') || fp.includes('crédito')) credVal += s.valor;
            else if(fp.includes('debito') || fp.includes('débito')) debVal += s.valor;
            else voucherVal += s.valor;
        });
        
        console.log(`Total: R$ ${totalVal.toFixed(2)}`);
        console.log(` Pix: R$ ${pixVal.toFixed(2)}`);
        console.log(` Credit: R$ ${credVal.toFixed(2)}`);
        console.log(` Debit: R$ ${debVal.toFixed(2)}`);
        console.log(` Voucher: R$ ${voucherVal.toFixed(2)}`);
    })
    .catch(console.error);
