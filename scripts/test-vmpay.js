const apiUrl = 'https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/relatorio/vendas_detalhadas?data_inicial=2026-04-16&data_final=2026-04-16&itens_por_pagina=100';
fetch(apiUrl, { headers: { 'Authorization': 'e8689749-58b1-4a3e-8f1c-11d1a5e2b42e' } })
    .then(r => r.json())
    .then(d => { 
        if(d.dados) console.log([...new Set(d.dados.map(x => x.itens[0]?.ponto_venda?.nome))].join(', ')); 
        else console.log(d); 
    })
    .catch(console.error);
