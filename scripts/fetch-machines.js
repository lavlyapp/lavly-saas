const url = `https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/maquinas?pagina=0&quantidade=100`;
const apiKey = "a2862031-5a98-4eb2-8b0a-e7b8cc195263"; // José Walter

async function run() {
    console.log(`Fetching MAQUINAS from ${url}...`);
    const res = await fetch(url, {
        headers: { 'x-api-key': apiKey }
    });

    if (!res.ok) {
        console.log("Error:", res.status, await res.text());
        return;
    }

    const data = await res.json();
    console.log("Machines Length:", data.length);
    if (data.length > 0) {
        data.forEach(m => {
            console.log(`ID: ${m.id} | NOME: ${m.nome} | TIPO: ${m.tipo}`);
        });
    }
}

run();
