import fetch from 'node-fetch';

const key = 'e8689749-58b1-4a3e-8f1c-11d1a5e2b42e'; // Cascavel
const BASE_URL = 'https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1';

async function main() {
    try {
        const res = await fetch(`${BASE_URL}/maquinas?pagina=0&quantidade=1000`, {
            headers: { 'x-api-key': key }
        });
        
        const data: any = await res.json();
        
        console.log(`Total machines found: ${data.length}`);
        
        // Group by lavanderia
        const grouped: any = {};
        data.forEach((m: any) => {
            const lav = m.lavanderia || "Unknown";
            if (!grouped[lav]) grouped[lav] = [];
            grouped[lav].push(`- ${m.nome} (ID: ${m.id}, Tipo: ${m.tipo})`);
        });
        
        for (const lav of Object.keys(grouped)) {
            console.log(`\nLavanderia: ${lav} (${grouped[lav].length} máquinas)`);
            console.log(grouped[lav].join('\n'));
        }
        
    } catch (e) {
        console.error(e);
    }
}

main();
