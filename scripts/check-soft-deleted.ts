import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSoftDeleted() {
    const { data: stores, error } = await supabaseAdmin.from('stores').select('*');
    if (error) {
        console.error("Error fetching stores:", error);
        return;
    }
    
    const missingLeandro = [
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

    const foundNames = stores.map(s => s.name);
    console.log("Total stores in DB:", stores.length);
    
    let foundCount = 0;
    for (const missing of missingLeandro) {
        const found = stores.find(s => s.name.toLowerCase() === missing.toLowerCase());
        if (found) {
            console.log(`Found missing store: ${missing} (is_active: ${found.is_active})`);
            foundCount++;
        }
    }
    if (foundCount === 0) {
        console.log("None of the missing Leandro stores are in the DB (hard-deleted).");
    }
}
checkSoftDeleted().catch(console.error);
