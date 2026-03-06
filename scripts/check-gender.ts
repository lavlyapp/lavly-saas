import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkGender() {
    console.log("Fetching ALL customers from Supabase in pages...");

    let allCustomers: any[] = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('customers').select('gender, name').range(page * 1000, (page + 1) * 1000 - 1);
        if (error) break;
        if (!data || data.length === 0) break;
        allCustomers.push(...data);
        page++;
    }
    const customers = allCustomers;
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
