import { VMPAY_API_BASE_URL, STATIC_VMPAY_CREDENTIALS } from "../lib/vmpay-config";

async function listLaundries() {
    const cred = STATIC_VMPAY_CREDENTIALS[0];
    console.log(`Listing Laundries using API Key for ${cred.name}...`);

    const url = `${VMPAY_API_BASE_URL}/lavanderias?pagina=0&quantidade=50`;

    try {
        const res = await fetch(url, {
            headers: { 'x-api-key': cred.apiKey }
        });

        console.log(`Status: ${res.status}`);
        if (res.ok) {
            const data = await res.json();
            console.log(`Found ${data.length} laundries:`);
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log("Error body:", await res.text());
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

listLaundries();
