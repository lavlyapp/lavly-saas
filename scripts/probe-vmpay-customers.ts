import { VMPAY_API_BASE_URL, getVMPayCredentials } from "../lib/vmpay-config";

async function probe() {
    const credentials = await getVMPayCredentials();
    const cred = credentials[0]; // Try the first one
    console.log(`Probing VMPay API for customers using ${cred.name}...`);

    const url = `${VMPAY_API_BASE_URL}/clientes?pagina=0&quantidade=10`;
    console.log(`Fetching ${url}...`);

    try {
        const res = await fetch(url, {
            headers: { 'x-api-key': cred.apiKey }
        });

        console.log(`Status: ${res.status} ${res.statusText}`);

        if (res.ok) {
            const data = await res.json();
            console.log("Success! Data preview:", JSON.stringify(data, null, 2));
        } else {
            const text = await res.text();
            console.log("Error body:", text);
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

probe();
