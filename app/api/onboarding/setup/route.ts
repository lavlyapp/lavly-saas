import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCanonicalStoreName } from '@/lib/vmpay-config';

const VMPAY_API_BASE_URL = process.env.NEXT_PUBLIC_VMPAY_API_BASE_URL || "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { apiKey, userId } = body;

        console.log(`[Onboarding] Validating API Key for User ${userId}...`);

        if (!apiKey || !userId) {
            return NextResponse.json({ error: 'API Key and User ID are required' }, { status: 400 });
        }

        const apiKeys = apiKey ? apiKey.split(/[\n,]+/).map((k: string) => k.trim()).filter((k: string) => k.length > 0) : [];
        const cleanApiKeyString = apiKeys.join(',');

        if (apiKeys.length === 0) {
            return NextResponse.json({ error: 'Nenhuma API Key válida informada' }, { status: 400 });
        }

        // 2. Discover Stores
        const uniqueStoreNames = new Set<string>();
        const storesData = new Map<string, any>();

        for (const key of apiKeys) {
            // 1. Validate against VMPay API
            const vmpayUrl = `${VMPAY_API_BASE_URL}/lavanderias?pagina=0&quantidade=1000`;
            const vmpayResponse = await fetch(vmpayUrl, {
                method: 'GET',
                headers: {
                    'x-api-key': key,
                    'Content-Type': 'application/json',
                },
            });

            if (!vmpayResponse.ok) {
                return NextResponse.json(
                    { error: `Chave Inválida (${key}). A VMPay retornou status ${vmpayResponse.status}` },
                    { status: 401 }
                );
            }

            const lavanderiasData = await vmpayResponse.json();
            if (!Array.isArray(lavanderiasData)) {
                return NextResponse.json({ error: 'Resposta inesperada da VMPay API' }, { status: 500 });
            }

            lavanderiasData.forEach((lavanderia: any) => {
                if (lavanderia.nome) {
                    const canonicalName = getCanonicalStoreName(lavanderia.nome);
                    uniqueStoreNames.add(canonicalName);
                    if (!storesData.has(canonicalName)) {
                        storesData.set(canonicalName, {
                            name: canonicalName,
                            originalName: lavanderia.nome,
                            cnpj: lavanderia.documentoEmpresa?.identificador || '',
                            is_active: true,
                            api_key: key
                        });
                    }
                }
            });
        }

        const assignedStoresArray = Array.from(uniqueStoreNames);
        console.log(`[Onboarding] Discovered ${assignedStoresArray.length} stores.`);

        if (assignedStoresArray.length === 0) {
            return NextResponse.json({ error: 'A chave é válida, mas não existem máquinas ou lojas atreladas a ela na VMPay.' }, { status: 400 });
        }

        // 3. Save to Supabase using Admin Bypass (since user is onboarding and might face RLS blocks)
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Update Profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ 
                vmpay_api_key: cleanApiKeyString,
                assigned_stores: assignedStoresArray,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (profileError) {
            return NextResponse.json({ error: `Erro ao atualizar perfil: ${profileError.message}` }, { status: 500 });
        }

        // Insert Stores
        const storesToInsert = Array.from(storesData.values()).map(store => ({
            name: store.name,
            cnpj: store.cnpj || null,
            api_key: store.api_key,
            is_active: true
        }));

        for (const store of storesToInsert) {
            const { error: storeError } = await supabaseAdmin
                .from('stores')
                .upsert(store, { onConflict: 'name', ignoreDuplicates: false });

            if (storeError) {
                console.warn(`[Onboarding] Warn: Could not upsert store ${store.name}:`, storeError.message);
            }
        }

        return NextResponse.json({ success: true, stores: assignedStoresArray });

    } catch (error: any) {
        console.error('[Onboarding] Unexpected Error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
