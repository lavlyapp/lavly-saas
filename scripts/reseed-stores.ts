import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

const stores = [
    {
        name: "Lavateria Cascavel",
        cnpj: "43660010000166",
        api_key: "e8689749-58b1-4a3e-8f1c-11d1a5e2b42e"
    },
    {
        name: "Lavateria SANTOS DUMONT",
        cnpj: "53261645000144",
        api_key: "2bfcb6f6-144b-46c1-8fc3-cef8fbf41729"
    },
    {
        name: "Lavateria JOSE WALTER",
        cnpj: "53261614000193",
        api_key: "a2862031-5a98-4eb2-8b0a-e7b8cc195263"
    },
    {
        name: "Lavateria SHOPPING (Maracanau)",
        cnpj: "51638594000100",
        api_key: "f08c45c8-126a-4cb4-ab5d-5c8805c8130f"
    },
    {
        name: "Lavateria SHOPPING SOLARES",
        cnpj: "54539282000129",
        api_key: "68360f6d-fbec-4991-bd2e-c6ff89201e40"
    },
    {
        name: "Lavateria JOQUEI",
        cnpj: "50741565000106",
        api_key: "cc9c772c-ad36-43a6-a3af-582da70feb07"
    }
];

async function seed() {
    console.log(`Seeding ${stores.length} stores...`);

    for (const store of stores) {
        const { error } = await supabase
            .from('stores')
            .upsert({
                ...store,
                is_active: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'cnpj' });

        if (error) {
            console.error(`Error seeding ${store.name}:`, error.message);
        } else {
            console.log(`Successfully seeded ${store.name}`);
        }
    }

    console.log('Seeding complete.');
}

seed();
