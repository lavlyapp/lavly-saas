import fetch from 'node-fetch';

async function testVercelSync() {
    const url = 'https://www.lavly.com.br/api/vmpay/sync?source=manual&cnpj=53261645000144&t=' + Date.now();
    console.log("Fetching Vercel API:", url);
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("Status:", res.status);
        if (data.records) {
             console.log("New Sales length:", data.records.length);
             if (data.debug) {
                 console.log("API Debug Logs:");
                 data.debug.forEach((log: string) => console.log("  ", log));
             }
        } else {
             console.log("Data:", data);
        }
    } catch(e: any) {
        console.error("Failed:", e.message);
    }
}
testVercelSync();
