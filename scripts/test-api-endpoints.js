const url = "https://vmlav.vmhub.vmtecnologia.io/api/v1/ciclos?dataInicio=2026-03-14T00:00:00&dataTermino=2026-03-14T23:59:59";
const apiKey = "e86895c1-eeb7-4ebc-b3a6-5faac6b940e4"; // cascavel test

fetch(url, { headers: { 'x-api-key': apiKey } })
    .then(r => {
        console.log(`Status /ciclos: ${r.status}`);
        return r.text();
    })
    .then(t => console.log(t.substring(0, 200)))
    .catch(console.error);

const urlVendas = "https://vmlav.vmhub.vmtecnologia.io/api/v1/vendas?dataInicio=2026-03-14T00:00:00&dataTermino=2026-03-14T23:59:59&somenteSucesso=true";
fetch(urlVendas, { headers: { 'x-api-key': apiKey } })
    .then(r => {
        console.log(`Status /vendas: ${r.status}`);
        return r.json().catch(() => ({ totalElements: "unknown" }));
    })
    .then(data => console.log(`Total /vendas:`, data.totalElements, "items count:", data.content?.length))
    .catch(console.error);
