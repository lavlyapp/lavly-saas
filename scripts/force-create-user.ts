import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const VMPAY_API_BASE_URL = "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function getCanonicalStoreName(rawName: string): string {
    const normalize = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    return normalize(rawName);
}

async function forceCreateUser() {
    const email = "nathalia.bertolin@lavateria.com";
    const password = "@Abcd123";
    const keys = [
        "486e2cdd-fd33-474f-8ea8-2cd815da4d36",
        "6cbfef01-3bce-45fc-ae2c-3dc0516ec2b7",
        "e0d37d38-e286-4f50-abb9-20a00137ff6e"
    ];

    console.log(`Setting up user ${email}...`);

    let assignedStoresArray: string[] = [];
    const uniqueStoreNames = new Set<string>();
    const storesData = new Map<string, any>();

    for (const key of keys) {
        console.log(`Fetching stores from VMPay for key ${key}...`);
        // Updated url to include pagination which VMPay requires strictly
        const vmpayUrl = `${VMPAY_API_BASE_URL}/maquinas?pagina=0&quantidade=1000`;
        const res = await fetch(vmpayUrl, {
            method: 'GET',
            headers: {
                'x-api-key': key,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            console.error(`  -> Failed: ${res.status} ${await res.text()}`);
            // Fallback to dummy store so the user isn't completely blocked
            const dummyName = `Loja Pendente - ${key.substring(0,5)}`;
            uniqueStoreNames.add(dummyName);
            storesData.set(dummyName, {
                name: dummyName,
                cnpj: `00000000-${key.substring(0,5)}`,
                is_active: true,
                api_key: key
            });
            continue;
        }

        const data = await res.json();
        if (Array.isArray(data)) {
            data.forEach((m: any) => {
                if (m.loja) {
                    const canonicalName = m.loja; // using raw or simple normalize for script
                    uniqueStoreNames.add(canonicalName);
                    if (!storesData.has(canonicalName)) {
                        storesData.set(canonicalName, {
                            name: canonicalName,
                            cnpj: m.documentoDeIdentificacao || '',
                            is_active: true,
                            api_key: key
                        });
                    }
                }
            });
        }
    }

    assignedStoresArray = Array.from(uniqueStoreNames);
    console.log(`Found ${assignedStoresArray.length} stores:`, assignedStoresArray);

    console.log(`Creating auth user...`);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });

    let userId = authData?.user?.id;
    if (authError) {
        console.log(`Auth Error (might exist): ${authError.message}`);
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = usersData.users.find(u => u.email === email);
        if (existingUser) {
            userId = existingUser.id;
            await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        }
    }

    if (!userId) {
        console.error("Could not get user ID.");
        return;
    }

    console.log(`Upserting profile for user ${userId}...`);
    await supabaseAdmin.from('profiles').upsert({
        id: userId,
        role: 'proprietario',
        max_stores: 3,
        assigned_stores: assignedStoresArray,
        vmpay_api_key: keys.join(','),
        subscription_status: 'active',
        plan: 'ouro',
        updated_at: new Date().toISOString()
    });

    console.log(`Inserting stores into database...`);
    for (const store of Array.from(storesData.values())) {
        const { error } = await supabaseAdmin.from('stores').upsert(store, { onConflict: 'name' });
        if (error) console.error(`Failed to insert store ${store.name}: ${error.message}`);
    }

    console.log(`Done! User ${email} is ready.`);
}

forceCreateUser();
