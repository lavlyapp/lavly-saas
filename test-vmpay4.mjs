import fetch from 'node-fetch';
const apiKey = 'ec80bbafea4fec261ed07613589b259d.d1a017ad62d2dbe527aebdceef3e1640aeb700c8b6d859a0f023ea0224dcaedc.70f69a5db7fbb3fedcd4b9eeb2cefd16d1ff8f82875cae6f54db149c4031d275';
const url = "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/maquinas?pagina=0&quantidade=10";
try {
    const r = await fetch(url, { headers: { 'x-api-key': apiKey } });
    console.log("Maquinas Status:", r.status);
    console.log(await r.text());
} catch (e) { console.error(e.message); }
