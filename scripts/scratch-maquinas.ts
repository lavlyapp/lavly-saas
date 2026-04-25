import fetch from 'node-fetch';

const BASE_URL = 'https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1';

async function main() {
    const key = 'e8689749-58b1-4a3e-8f1c-11d1a5e2b42e'; // Cascavel
    const res = await fetch(`${BASE_URL}/maquinas?pagina=0&quantidade=1`, {
        headers: { 'x-api-key': key }
    });
    const data: any = await res.json();
    console.log(JSON.stringify(data[0], null, 2));
}

main();
