const url = `https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/clientes?pagina=0&quantidade=1000`;
const apiKey = "2bfcb6f6-144b-46c1-8fc3-cef8fbf41729"; // Santos Dumont

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
        // Find one with gender/sexo
        let found = data.find(c => c.genero || c.sexo);
        if (!found) found = data[0];

        console.log("Sample Customer Object:", JSON.stringify(found, null, 2));
    } else {
        console.log("Empty array returned.");
    }
}

run();
