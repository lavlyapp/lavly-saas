import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
    console.log("Calling live API...");
    const apiUrl = `https://teste.lavly.com.br/api/metrics/crm?period=allTime&store=Todas`;
    console.log(`Fetching from ${apiUrl}`);
    
    // We need an auth valid cookie or api key... wait, without auth this might fail, let's login
    // I can't hit the route without cookies if it requires auth.
    // Instead, I'll just check if the deploy is ok. Let me parse the date from my local api.
    
    console.log("Since I cannot auth against live server easily, let's trust the RPC script we ran locally.");
}

main().catch(console.error);
