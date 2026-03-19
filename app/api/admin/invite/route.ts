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
        const { email, apiKey, password, plan = 'ouro', role = 'proprietario', maxStores = 1 } = body;

        console.log(`[Admin Invite] Starting invite for: ${email} with plan: ${plan}, maxStores: ${maxStores}`);
        if (!email || !password) {
            return NextResponse.json({ error: 'Email and Password are required' }, { status: 400 });
        }

        if (
            password.length < 8 ||
            !/[A-Z]/.test(password) ||
            !/[a-z]/.test(password) ||
            !/[0-9]/.test(password) ||
            !/[^A-Za-z0-9]/.test(password)
        ) {
            return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres, contendo letras maiúsculas, minúsculas, números e símbolos.' }, { status: 400 });
        }

        let assignedStoresArray: string[] = [];
        const uniqueStoreNames = new Set<string>();
        const storesData = new Map<string, any>();

        // 2. ONLY Validate and hit the VMPay API if an apiKey was provided
        if (apiKey && apiKey.trim().length > 0) {
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

            machinesData.forEach(machine => {
                if (machine.loja) {
                    const canonicalName = getCanonicalStoreName(machine.loja);
                    uniqueStoreNames.add(canonicalName);
                    if (!storesData.has(canonicalName)) {
                        storesData.set(canonicalName, {
                            name: canonicalName,
                            originalName: machine.loja,
                            cnpj: machine.documentoDeIdentificacao || '',
                            is_active: true,
                            api_key: apiKey
                        });
                    }
                }
            });

            assignedStoresArray = Array.from(uniqueStoreNames).slice(0, Number(maxStores));

            if (assignedStoresArray.length === 0) {
                return NextResponse.json(
                    { error: 'API Key is valid, mas nenhuma loja foi encontrada para esta chave.' },
                    { status: 400 }
                );
            }
            console.log(`[Admin Invite] Found ${assignedStoresArray.length} stores based on provided API Key.`);
        } else {
            console.log(`[Admin Invite] No API Key provided. Creating user in ONBOARDING PENDING status...`);
        }

        // 4. Create User in Supabase Auth
        console.log(`[Admin Invite] Creating auth user for ${email}...`);
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true // Force confirmation so they can login immediately
        });

        let userId = authData?.user?.id;

        if (authError) {
            if (authError.message.includes('already registered')) {
                console.log(`[Admin Invite] User ${email} already exists. Updating their profile.`);
                const { data: existingUser } = await supabaseAdmin.from('auth.users').select('id').eq('email', email).single();
                if (existingUser) {
                    userId = existingUser.id;
                    // Optional: update their password if they already exist so the new password works
                    await supabaseAdmin.auth.admin.updateUserById(userId as string, { password });
                } else {
                    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
                    const foundUser = usersData.users.find(u => u.email === email);
                    if (foundUser) {
                        userId = foundUser.id;
                        await supabaseAdmin.auth.admin.updateUserById(userId as string, { password });
                    } else {
                        return NextResponse.json({ error: `User exists but could not find ID: ${authError.message}` }, { status: 400 });
                    }
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
                plan: plan,
                max_stores: Number(maxStores),
                assigned_stores: assignedStoresArray,
                vmpay_api_key: apiKey && apiKey.trim().length > 0 ? apiKey : null,
                subscription_status: 'active',
                updated_at: new Date().toISOString()
            });

        if (profileError) {
            return NextResponse.json({ error: `Profile Error: ${profileError.message}` }, { status: 500 });
        }

        // 6. Upsert Stores into public.stores if any
        if (storesData.size > 0) {
            console.log(`[Admin Invite] Seeding ${storesData.size} stores into the database...`);
            const storesToInsert = Array.from(storesData.values()).map(store => ({
                name: store.name,
                cnpj: store.cnpj || null,
                api_key: apiKey,
                is_active: true
            }));

            for (const store of storesToInsert) {
                const { error: storeError } = await supabaseAdmin
                    .from('stores')
                    .upsert(store, { onConflict: 'name', ignoreDuplicates: false });

                if (storeError) {
                    console.warn(`[Admin Invite] Warn: Could not upsert store ${store.name}:`, storeError.message);
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `User created successfully! ${assignedStoresArray.length > 0 ? 'Stores connected.' : 'Pending Client Setup.'}`,
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
