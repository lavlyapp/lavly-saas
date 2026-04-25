import fetch from 'node-fetch';

const keysMap: any = {
    'e8689749-58b1-4a3e-8f1c-11d1a5e2b42e': 'Lavateria Cascavel',
    '2bfcb6f6-144b-46c1-8fc3-cef8fbf41729': 'Lavateria SANTOS DUMONT',
    'a2862031-5a98-4eb2-8b0a-e7b8cc195263': 'Lavateria JOSE WALTER',
    'f08c45c8-126a-4cb4-ab5d-5c8805c8130f': 'Lavateria SHOPPING (Maracanau)',
    '68360f6d-fbec-4991-bd2e-c6ff89201e40': 'Lavateria SHOPPING SOLARES',
    'cc9c772c-ad36-43a6-a3af-582da70feb07': 'Lavateria JOQUEI'
};

const BASE_URL = 'https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1';

async function main() {
    for (const key of Object.keys(keysMap)) {
        try {
            const res = await fetch(`${BASE_URL}/maquinas?pagina=0&quantidade=1000`, {
                headers: { 'x-api-key': key }
            });
            
            if (!res.ok) {
                console.log(`Failed for key ${key.substring(0, 5)}: ${res.status}`);
                continue;
            }
            
            const data: any = await res.json();
            
            if (!Array.isArray(data) || data.length === 0) {
                console.log(`No machines for ${keysMap[key]}`);
                continue;
            }
            
            let washers = 0;
            let dryers = 0;
            
            data.forEach((m: any) => {
                const tipo = (m.tipo || '').toUpperCase();
                const nome = String(m.nome).toLowerCase();
                
                if (tipo === "SECAGEM" || nome.includes("secadora") || nome.includes("seca")) {
                    dryers++;
                } else if (tipo === "LAVAGEM" || nome.includes("lavadora") || nome.includes("lava")) {
                    washers++;
                } else {
                    // Fallback using odd/even logic common in lavateria
                    const idNum = parseInt(m.id, 10);
                    if (!isNaN(idNum)) {
                        if (idNum % 2 === 0) dryers++; // usually even is dryer
                        else washers++;
                    } else {
                        washers++;
                    }
                }
            });
            
            console.log(`- **${keysMap[key]}**: ${data.length} máquinas no total (${washers} Lavadoras / ${dryers} Secadoras)`);
            
        } catch (e) {
            console.error(`Error for key ${key}:`, e);
        }
    }
}

main();
