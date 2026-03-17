import fetch from 'node-fetch';

async function testVercelRawErrors() {
    const url = 'https://www.lavly.com.br/api/vmpay/sync?source=manual&cnpj=50741565000106&t=' + Date.now();
    console.log("Fetching Vercel API:", url);
    try {
        const res = await fetch(url);
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Raw Text:", text);
    } catch(e: any) {
        console.error("Failed:", e.message);
    }
}
testVercelRawErrors();
