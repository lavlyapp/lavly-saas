const urlBase = "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas";
const apiKey = "e8689749-58b1-4a3e-8f1c-11d1a5e2b42e"; // cascavel proper
const startDate = "2026-03-14T00:00:00";
const endDate = "2026-03-14T23:59:59";

async function testParam(paramStr) {
    const url = `${urlBase}?dataInicio=${startDate}&dataTermino=${endDate}&pagina=0&quantidade=100${paramStr}`;
    try {
        const r = await fetch(url, { headers: { 'x-api-key': apiKey } });
        console.log(`[${r.status}] ${paramStr}`);
        if (r.status === 200) {
            const data = await r.json();
            const content = data.content || [];
            const totalVal = content.reduce((sum, s) => sum + (s.valor || 0), 0);
            console.log(` ---> Total elements: ${content.length} | Sum: R$ ${totalVal.toFixed(2)}`);
        } else {
            const text = await r.text();
            console.log(` ---> text: ${text.substring(0, 100)}`);
        }
    } catch (e) {
        console.log(`[ERROR] ${paramStr}`);
    }
}

async function main() {
    console.log("Testing VMPay Sales with different parameters...");
    await testParam("&somenteSucesso=true");
    await testParam("");
    await testParam("&somenteSucesso=false");
    await testParam("&status=TODOS");
    await testParam("&status=APROVADO");
}

main();
