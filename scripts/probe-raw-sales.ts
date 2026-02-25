import { VMPAY_API_BASE_URL, getVMPayCredentials } from "../lib/vmpay-config";

async function probeRawSales() {
    const credentials = await getVMPayCredentials();
    const cred = credentials[0];
    if (!cred) {
        console.error("No credentials found");
        return;
    }
    console.log(`Fetching RAW sales for ${cred.name}...`);

    // Fetch recent sales (last 48h to ensure data)
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 2);

    // API Date format: ISO 8601
    const url = `${VMPAY_API_BASE_URL}/vendas?dataInicio=${start.toISOString()}&dataTermino=${end.toISOString()}&somenteSucesso=true&pagina=0&quantidade=5`;

    try {
        const res = await fetch(url, {
            headers: { 'x-api-key': cred.apiKey }
        });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                console.log("RAW SALE OBJECT KEYS:", Object.keys(data[0]));
                console.log("RAW SALE OBJECT SAMPLE:", JSON.stringify(data[0], null, 2));

                // Check specifically for customer ID or gender
                console.log("\n--- CUSTOMER FIELDS CHECK ---");
                data.slice(0, 3).forEach((s, i) => {
                    const id = s.idCliente || s.clienteId || 'N/A';
                    const sName = s.cliente || s.nomeCliente || 'N/A';
                    const gender = s.genero || s.sexo || s.gender || 'N/A';
                    console.log(`[${i}] ID: ${id} | NAME: ${sName} | GENDER: ${gender}`);
                });
            } else {
                console.log("No sales found or empty array.");
            }
        } else {
            console.log("Error:", res.status, await res.text());
        }
    } catch (e) {
        console.error(e);
    }
}

probeRawSales();
