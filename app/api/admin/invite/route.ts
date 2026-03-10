import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCanonicalStoreName } from '@/lib/vmpay-config';

const VMPAY_API_BASE_URL = process.env.NEXT_PUBLIC_VMPAY_API_BASE_URL || "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";

// We need the service role key to bypass RLS and create users
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const body = await req.json();
        const { email, apiKey, role = 'owner' } = body;

        if (!email || !apiKey) {
            return NextResponse.json({ error: 'Email and API Key are required' }, { status: 400 });
        }

        // 1. Verify if the user making the request is an admin
        // Note: In a real production app, verify the JWT from cookies/headers here
        // For now, relying on the client sending a valid request from the admin dashboard
        // A better approach would be to extract auth from headers

        // 2. Hit the VMPay API to discover stores linked to this key
        console.log(`[Admin Invite] Validating API Key for ${email}...`);
        const vmpayUrl = `${VMPAY_API_BASE_URL}/maquinas`;
        const vmpayResponse = await fetch(vmpayUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!vmpayResponse.ok) {
            return NextResponse.json(
                { error: `Invalid API Key. VMPay returned status ${vmpayResponse.status}` },
                { status: 401 }
            );
        }

        const machinesData = await vmpayResponse.json();
        if (!Array.isArray(machinesData)) {
            return NextResponse.json({ error: 'Unexpected response from VMPay API' }, { status: 500 });
        }

        // 3. Extract unique store names and normalize them
        const uniqueStoreNames = new Set<string>();
        const storesData = new Map<string, any>(); // Map canonical name to the first machine's store data

        machinesData.forEach(machine => {
            if (machine.loja) {
                const canonicalName = getCanonicalStoreName(machine.loja);
                uniqueStoreNames.add(canonicalName);
                if (!storesData.has(canonicalName)) {
                    // Save generic store info from this machine to seed the db
                    storesData.set(canonicalName, {
                        name: canonicalName,
                        originalName: machine.loja,
                        cnpj: machine.documentoDeIdentificacao || '', // Often VMPay returns CNPJ here
                        is_active: true,
                        api_key: apiKey
                    });
                }
            }
        });

        const assignedStoresArray = Array.from(uniqueStoreNames);

        if (assignedStoresArray.length === 0) {
            return NextResponse.json(
                { error: 'API Key is valid, but no stores or machines were found for this key.' },
                { status: 400 }
            );
        }

        console.log(`[Admin Invite] Found ${assignedStoresArray.length} stores:`, assignedStoresArray);

        // 4. Create User in Supabase Auth (This sends the invite email if email confirmations are on)
        // If the user already exists, Supabase might throw or return the existing user based on settings
        console.log(`[Admin Invite] Creating auth user for ${email}...`);
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: false // Depends on if you want them to have to click a link
        });

        let userId = authData?.user?.id;

        if (authError) {
            // If user already exists, we might just want to update their profile instead of failing
            if (authError.message.includes('already registered')) {
                console.log(`[Admin Invite] User ${email} already exists. We will just update their profile.`);
                // We need to find their ID
                const { data: existingUser } = await supabaseAdmin.from('profiles').select('id').eq('id', (await supabaseAdmin.from('auth.users').select('id').eq('email', email).single()).data?.id).single()

                // Fallback direct query if first query fails (admin API)
                const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
                const foundUser = usersData.users.find(u => u.email === email);
                if (foundUser) {
                    userId = foundUser.id;
                } else {
                    return NextResponse.json({ error: `User exists but could not find ID: ${authError.message}` }, { status: 400 });
                }
            } else {
                return NextResponse.json({ error: `Auth Error: ${authError.message}` }, { status: 400 });
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'Failed to create or find user ID' }, { status: 500 });
        }

        // 5. Upsert into public.profiles
        console.log(`[Admin Invite] Upserting profile for user ${userId}...`);
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                role: role,
                assigned_stores: assignedStoresArray,
                vmpay_api_key: apiKey,
                updated_at: new Date().toISOString()
            });

        if (profileError) {
            return NextResponse.json({ error: `Profile Error: ${profileError.message}` }, { status: 500 });
        }

        // 6. Upsert Stores into public.stores
        console.log(`[Admin Invite] Seeding ${storesData.size} stores into the database...`);
        const storesToInsert = Array.from(storesData.values()).map(store => ({
            name: store.name,
            cnpj: store.cnpj || null,
            api_key: apiKey,
            is_active: true
        }));

        // We use upsert based on 'name' as it was unique, or we just insert if they don't exist
        for (const store of storesToInsert) {
            const { error: storeError } = await supabaseAdmin
                .from('stores')
                .upsert(store, { onConflict: 'name', ignoreDuplicates: false });

            if (storeError) {
                console.warn(`[Admin Invite] Warn: Could not upsert store ${store.name}:`, storeError.message);
            }
        }

        return NextResponse.json({
            success: true,
            message: `User invited successfully! Found ${assignedStoresArray.length} stores.`,
            stores: assignedStoresArray
        });

    } catch (error: any) {
        console.error('[Admin Invite] Unexpected Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
