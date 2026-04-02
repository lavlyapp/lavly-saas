async function testApi() {
    console.log('Testing Vercel API for ALL TIME...');
    try {
        const res = await fetch('https://teste.lavly.com.br/api/metrics/financial?store=Todas&period=allTime');
        const json = await res.json();
        console.log('API Response:', JSON.stringify(json, null, 2));
    } catch (e) {
        console.error('Fetch error:', e);
    }
}
testApi();
