import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const goodStores = [
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

async function cleanup() {
    console.log("Cleaning up Leandro's profile in Production DB...");
    
    // Find Leandro
    // The bad stores are the ones currently assigned that are NOT in our good stores, EXCEPT 'Lavateria Cascavel' etc
    // Actually, we'll just force overwrite his assigned_stores to the good one.
    
    await supabaseAdmin.from('profiles').update({
        assigned_stores: goodStores,
        max_stores: 18
    }).eq('id', 'cacba315-629f-4a43-aa75-7b6a199152aa');
    
    console.log("Profile assignment reset to standard 12 canonical stores.");
}

cleanup().catch(console.error);
