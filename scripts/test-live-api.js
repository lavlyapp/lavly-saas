const fetch = require('node-fetch');

async function main() {
    const url = 'https://teste.lavly.com.br/api/metrics/machines?store=Lavateria%20Cascavel&period=thisMonth&t=' + Date.now();
    console.log(`Fetching: ${url}`);
    
    try {
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && json.payload) {
            console.log(`Returned machines count: ${json.payload.machines.length}`);
            const machines = json.payload.machines.map(m => m.machineName);
            console.log(`Machines: ${machines.join(', ')}`);
        } else {
            console.log("Error or false success:", json);
        }
    } catch (e) {
        console.error(e);
    }
}

main();
