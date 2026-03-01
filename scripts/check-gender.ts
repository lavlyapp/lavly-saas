import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkGender() {
    console.log("Fetching customers from Supabase...");
    const { data: customers, error } = await supabase.from('customers').select('gender, name');

    if (error) {
        console.error("Error fetching customers:", error);
        return;
    }

    console.log(`Total customers: ${customers.length}`);

    const counts = { M: 0, F: 0, U: 0, Outros: 0 };
    const sampleU: string[] = [];

    customers.forEach(c => {
        const g = c.gender ? c.gender.toUpperCase() : 'U';
        if (g === 'M' || g === 'MASCULINO') counts.M++;
        else if (g === 'F' || g === 'FEMININO') counts.F++;
        else if (g === 'U' || g === 'INDEFINIDO' || g === '') {
            counts.U++;
            if (sampleU.length < 5) sampleU.push(c.name);
        }
        else counts.Outros++;
    });

    console.log("Gender distribution:", counts);
    console.log("Sample of undefined gender customers:", sampleU);
}

checkGender();
