const VMPAY_API_BASE_URL = "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";

async function checkKeys() {
    const keys = [
        "e0d37d38-e286-4f58-abb9-20a00137ff6e"
    ];

    for (const key of keys) {
        console.log(`Checking key: ${key}`);
        const vmpayUrl = `${VMPAY_API_BASE_URL}/lavanderias?pagina=0&quantidade=1000`;
        const res = await fetch(vmpayUrl, {
            method: 'GET',
            headers: {
                'x-api-key': key,
                'Content-Type': 'application/json',
            },
        });
        
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            const data = await res.json();
            console.log(`First machine object:`, data[0]);
        }
    }
}

checkKeys();
