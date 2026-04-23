import fetch from 'node-fetch'; // NextJS global fetch

async function testLiveAPI() {
    const url = 'https://www.teste.lavly.com.br/api/vmpay/sync?source=manual&cnpj=50741565000106&t=' + Date.now();
    console.log(`Fetching ${url}...`);
    
    const response = await fetch(url);
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    
    const data = await response.json();
    console.log('Data Records Length:', data.records?.length || data.error || 0);
}

testLiveAPI();
