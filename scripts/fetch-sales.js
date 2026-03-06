const url = `https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/vendas?dataInicio=2026-03-06T00:00:00&dataTermino=2026-03-06T23:59:59&somenteSucesso=true&pagina=0&quantidade=10`;
const apiKey = "e8689749-58b1-4a3e-8f1c-11d1a5e2b42e"; // Cascavel

async function run() {
    console.log(`Fetching from ${url}...`);
    const res = await fetch(url, {
        headers: { 'x-api-key': apiKey }
    });

    if (!res.ok) {
        console.log("Error:", res.status, await res.text());
        return;
    }

    const data = await res.json();
    console.log("Raw Response Array Length:", data.length);
    if (data.length > 0) {
        console.log("Sample Sale Object:", JSON.stringify(data[0], null, 2));
    } else {
        console.log("Empty data.");
    }
}

run();
