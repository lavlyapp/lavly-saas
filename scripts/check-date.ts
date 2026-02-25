import { VMPAY_API_BASE_URL, getVMPayCredentials } from "../lib/vmpay-config";

async function run() {
    try {
        const credentials = await getVMPayCredentials();
        const cred = credentials[0];
        const res = await fetch(`${VMPAY_API_BASE_URL}/vendas?quantidade=1&pagina=0`, {
            headers: { 'x-api-key': cred.apiKey }
        });
        const data = await res.json();
        if (data.length > 0) {
            console.log("Raw Date:", data[0].data);
            console.log("Parsed (New Date):", new Date(data[0].data).toString());
            console.log("Parsed (ISO):", new Date(data[0].data).toISOString());
        }
    } catch (e) {
        console.error(e);
    }
}

run();
