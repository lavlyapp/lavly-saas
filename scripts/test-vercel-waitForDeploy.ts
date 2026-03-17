import fetch from 'node-fetch';

async function waitForVercelDeployAndTest() {
    console.log("Polling Vercel API until 'debug' field appears...");
    
    for (let i = 0; i < 20; i++) {
        const url = 'https://www.lavly.com.br/api/vmpay/sync?source=manual&cnpj=50741565000106&t=' + Date.now();
        try {
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.debug) {
                console.log("\n=== DEPLOY ACTIVE! ===");
                console.log("Status:", res.status);
                console.log("New Sales length:", data.records?.length);
                console.log("\n=== VERCEL INTERNAL LOGS ===");
                data.debug.forEach((log: string) => console.log(log));
                break;
            } else {
                console.log(`Attempt ${i + 1}: Still on old version without debug field.`);
            }
        } catch(e: any) {
            console.error("Failed:", e.message);
        }
        await new Promise(r => setTimeout(r, 10000));
    }
}
waitForVercelDeployAndTest();
