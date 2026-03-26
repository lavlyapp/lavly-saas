import { getCanonicalStoreName } from '../lib/vmpay-config';

const VMPAY_API_BASE_URL = process.env.NEXT_PUBLIC_VMPAY_API_BASE_URL || "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";

async function test() {
    const key = "e0d37d38-e286-4f58-abb9-20a00137ff6e";
    const vmpayUrl = `${VMPAY_API_BASE_URL}/lavanderias?pagina=0&quantidade=1000`;
    console.log("Fetching", vmpayUrl);
    const res = await fetch(vmpayUrl, {
        method: 'GET',
        headers: {
            'x-api-key': key,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        },
    });

    console.log("Status:", res.status);
    const data = await res.json();
    console.log("IsArray?", Array.isArray(data));
    console.log("Length:", Array.isArray(data) ? data.length : 0);
    
    const uniqueStoreNames = new Set<string>();
    const storesData = new Map<string, any>();

    if (Array.isArray(data)) {
        data.forEach((lavanderia: any) => {
            if (lavanderia.nome) {
                const canonicalName = getCanonicalStoreName(lavanderia.nome);
                uniqueStoreNames.add(canonicalName);
                if (!storesData.has(canonicalName)) {
                    storesData.set(canonicalName, {
                        name: canonicalName,
                        originalName: lavanderia.nome,
                        cnpj: lavanderia.documentoEmpresa?.identificador || '',
                        is_active: true,
                        api_key: key
                    });
                }
            }
        });
    }

    const arr = Array.from(uniqueStoreNames);
    console.log("Final array size:", arr.length);
    console.log("Stores:", arr);
}

test();
