import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
    const { data: configs, error } = await supabase.from('config').select('*');
    if (error || !configs || configs.length === 0) {
        console.log("Error or no config found", error);
        return;
    }

    // Find VMPay config
    const vmpayConfig = configs.find(c => c.key === 'vmpay_credentials');
    if (!vmpayConfig) { console.log("vmpay_credentials not found"); return; }

    const stores = vmpayConfig.value;
    const cred = Array.isArray(stores) ? stores[0] : JSON.parse(stores)[0];

    console.log(`Testing store: ${cred.name}`);

    const url = `${process.env.NEXT_PUBLIC_VMPAY_API_BASE_URL}/clientes?pagina=0&quantidade=5`;
    const res = await fetch(url, {
        headers: { 'x-api-key': cred.apiKey }
    });

    if (!res.ok) {
        console.log("Error fetching VMPay", res.status);
        return;
    }

    const data = await res.json();
    console.log("Payload Length:", data.length);
    if (data.length > 0) {
        console.log("Sample:", JSON.stringify(data[0], null, 2));
    }
}
run();
