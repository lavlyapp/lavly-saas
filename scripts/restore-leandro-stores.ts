import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';


dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const LEANDRO_API_KEY = "3f7509f7-4f65-4fea-b6a9-55901d1b22d6";
const VMPAY_API_BASE_URL = "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";

const STORE_NAME_MAP: Record<string, string> = {
    "LAVATERIA BEZERRA MENEZES": "Lavateria Cascavel",
    "BEZERRA MENEZES": "Lavateria Cascavel",
    "BEZERRA": "Lavateria Cascavel",
    "CASCAVEL": "Lavateria Cascavel",
    "LAVATERIA SANTOS DUMONT": "Lavateria SANTOS DUMONT",
    "SANTOS DUMONT": "Lavateria SANTOS DUMONT",
    "LAVATERIA JOSE WALTER": "Lavateria JOSE WALTER",
    "JOSE WALTER": "Lavateria JOSE WALTER",
    "LAVATERIA SHOPPING (MARACANAU)": "Lavateria SHOPPING (Maracanau)",
    "MARACANAU": "Lavateria SHOPPING (Maracanau)",
    "LAVATERIA SHOPPING SOLARES": "Lavateria SHOPPING SOLARES",
    "SOLARES": "Lavateria SHOPPING SOLARES",
    "LAVATERIA JOQUEI": "Lavateria JOQUEI",
    "JOQUEI": "Lavateria JOQUEI",
    
    // Leandro Stores (Multi-Store Mapping)
    "Lavateria JARDIM VETORASSO": "Lavateria Jardim Vetorasso",
    "Lavateria JARDIM ALTO ALEGRE": "Lavateria Jardim Alto Alegre",
    "Lavateria JARDIM SORAIA": "Lavateria Jardim Soraia",
    "LAVATERIA FAST ANALIA FRANCO": "Lavateria Analia Franco",
    "Lavateria UNIVERSITARIO": "Lavateria Universitario",
    "Lavateria ESTORIL": "Lavateria Estoril",
    "Lavateria Itinerante": "Lavateria Itinerante",
    "Lavateria LOURDES": "Lavateria Lourdes",
    "Lavateria VILA AMÉLIA": "Lavateria Vila Amelia",
    "Lavateria VILLAGE MALL": "Lavateria Village Mall",
    "Lavateria trailer": "Lavateria Trailer",
    "LAVATERIA POSTO BRAZILIAN": "Lavateria Posto Brazilian"
};

function getCanonicalStoreName(rawName: string): string {
    if (!rawName) return "Desconhecido";
    const normalize = (s: string) =>
        (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

    const normalizedRaw = normalize(rawName);

    for (const [key, val] of Object.entries(STORE_NAME_MAP)) {
        if (normalize(key) === normalizedRaw) {
            return val;
        }
    }
    const sortedKeys = Object.keys(STORE_NAME_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        const normalizedKey = normalize(key);
        if (normalizedRaw.includes(normalizedKey) || normalizedKey.includes(normalizedRaw)) {
            return STORE_NAME_MAP[key];
        }
    }
    return rawName;
}

const targetCanonicalNames = [
    "Lavateria Jardim Vetorasso",
    "Lavateria Jardim Alto Alegre",
    "Lavateria Jardim Soraia",
    "Lavateria Analia Franco",
    "Lavateria Universitario",
    "Lavateria Estoril",
    "Lavateria Itinerante",
    "Lavateria Lourdes",
    "Lavateria Vila Amelia",
    "Lavateria Village Mall",
    "Lavateria Trailer",
    "Lavateria Posto Brazilian"
];

async function main() {
    console.log("Fetching stores from VMPay...");
    const url = `${VMPAY_API_BASE_URL}/lavanderias?pagina=0&quantidade=50`;
    const res = await fetch(url, { headers: { 'x-api-key': LEANDRO_API_KEY } });
    if (!res.ok) throw new Error("HTTP Fetch failed: " + res.status);
    const data = await res.json();
    
    console.log(`Fetched ${data.length} stores from VMPay.`);
    
    const storesToUpsert = [];

    for (const l of data) {
        const canonicalName = getCanonicalStoreName(l.nome);
        if (targetCanonicalNames.includes(canonicalName)) {
            const baseCnpj = l.documentoEmpresa?.identificador || "00000000000000";
            const cnpj = `${baseCnpj}-${l.id}`;
            storesToUpsert.push({
                name: canonicalName,
                cnpj: cnpj,
                api_key: LEANDRO_API_KEY,
                is_active: true,
                has_ac_subscription: false
                // Add address fields if present in l.endereco
            });
            console.log(`Mapped: ${l.nome} -> ${canonicalName}`);
        }
    }
    
    // De-duplicate if VMPay returns multiple with the same canonical name
    const uniqueMap = new Map();
    for (const s of storesToUpsert) {
        uniqueMap.set(s.name, s);
    }
    const finalStores = Array.from(uniqueMap.values());
    console.log(`\nFound ${finalStores.length} stores to insert/upsert into Supabase.`);
    
    for (const store of finalStores) {
        const { error } = await supabaseAdmin.from('stores').upsert(store, { onConflict: 'name' });
        if (error) {
            console.error(`Failed to upsert ${store.name}:`, error.message);
        } else {
            console.log(`Upserted ${store.name}`);
        }
    }
}

main().catch(console.error);
