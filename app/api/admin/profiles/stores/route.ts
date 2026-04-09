import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getCanonicalStoreName } from '@/lib/vmpay-config';

// Bypass RLS strictly inside the backend
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

const VMPAY_API_BASE_URL = process.env.NEXT_PUBLIC_VMPAY_API_BASE_URL || "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        // 1. Validate Caller is Admin
        const cookieStore = await cookies();
        const authClient = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value },
                    set(name: string, value: string, options: CookieOptions) { 
                        try { cookieStore.set({ name, value, ...options }) } catch(e) {}
                    },
                    remove(name: string, options: CookieOptions) { 
                        try { cookieStore.set({ name, value: '', ...options }) } catch(e) {}
                    },
                },
            }
        );

        const { data: { user } } = await authClient.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: callerProfile } = await authClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (callerProfile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Apenas administradores podem vincular novas lojas.' }, { status: 403 });
        }

        // 2. Parse payload
        const body = await req.json();
        const { targetId, apiKey } = body;

        if (!targetId || !apiKey) {
            return NextResponse.json({ error: 'targetId e apiKey são obrigatórios.' }, { status: 400 });
        }

        const newKeys = apiKey.split(/[\n,]+/).map((k: string) => k.trim()).filter((k: string) => k.length > 0);
        if (newKeys.length === 0) {
            return NextResponse.json({ error: 'Nenhuma chave fornecida.' }, { status: 400 });
        }

        // 3. Fetch current user data (needs Admin client as we are modifying another user)
        const { data: targetProfile, error: targetError } = await supabaseAdmin
            .from('profiles')
            .select('assigned_stores, vmpay_api_key, max_stores')
            .eq('id', targetId)
            .single();

        if (targetError || !targetProfile) {
            return NextResponse.json({ error: 'Perfil alvo não encontrado.' }, { status: 404 });
        }

        let existingStores = Array.isArray(targetProfile.assigned_stores) ? targetProfile.assigned_stores : [];
        let existingKeys = targetProfile.vmpay_api_key 
            ? targetProfile.vmpay_api_key.split(/[\n,]+/).map((k: string) => k.trim()).filter((k: string) => k.length > 0)
            : [];

        const mergedKeysSet = new Set<string>([...existingKeys, ...newKeys]);

        // 4. Validate new keys with VMPay
        const uniqueStoreNames = new Set<string>();
        const storesData = new Map<string, any>();

        for (const key of newKeys) {
            const vmpayUrl = `${VMPAY_API_BASE_URL}/lavanderias?pagina=0&quantidade=1000&_t=${Date.now()}`;
            const vmpayResponse = await fetch(vmpayUrl, {
                method: 'GET',
                headers: {
                    'x-api-key': key,
                    'Content-Type': 'application/json',
                },
                cache: 'no-store'
            });

            if (!vmpayResponse.ok) {
                return NextResponse.json(
                    { error: `Chave Inválida (${key.substring(0, 8)}...). A VMPay retornou status ${vmpayResponse.status}.` },
                    { status: 400 }
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

        // 5. Upsert new stores into public.stores
        if (storesData.size > 0) {
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
                    console.warn(`[Admin Stores] Warn: Could not upsert store ${store.name}:`, storeError.message);
                }
            }
        }

        // 6. Merge stores into the target user
        const mergedStoresSet = new Set<string>([...existingStores, ...Array.from(uniqueStoreNames)]);
        const finalStoresArray = Array.from(mergedStoresSet);

        // Auto-bump max_stores if the new store count exceeds the current limit to prevent UI breakages
        const finalMaxStores = Math.max(targetProfile.max_stores || 1, finalStoresArray.length);

        // 7. Save modifications to target profile
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                assigned_stores: finalStoresArray,
                vmpay_api_key: Array.from(mergedKeysSet).join(','),
                max_stores: finalMaxStores,
                updated_at: new Date().toISOString()
            })
            .eq('id', targetId);

        if (updateError) {
             return NextResponse.json({ error: `Erro ao atualizar perfil: ${updateError.message}` }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `${uniqueStoreNames.size} lojas foram sincronizadas e vinculadas com sucesso!`,
            newStoresCount: uniqueStoreNames.size,
            totalStores: finalStoresArray.length
        });

    } catch (e: any) {
        console.error('[Admin Stores] API Error:', e);
        return NextResponse.json({ error: e.message || 'Erro inesperado' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const cookieStore = await cookies();
        const authClient = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value },
                    set(name: string, value: string, options: CookieOptions) { 
                        try { cookieStore.set({ name, value, ...options }) } catch(e) {}
                    },
                    remove(name: string, options: CookieOptions) { 
                        try { cookieStore.set({ name, value: '', ...options }) } catch(e) {}
                    },
                },
            }
        );

        const { data: { user } } = await authClient.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: callerProfile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
        if (callerProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await req.json();
        const { targetId, storeName } = body;

        if (!targetId || !storeName) return NextResponse.json({ error: 'targetId e storeName são obrigatórios' }, { status: 400 });

        const { data: targetProfile, error: targetError } = await supabaseAdmin
            .from('profiles').select('assigned_stores').eq('id', targetId).single();

        if (targetError || !targetProfile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });

        const existingStores = Array.isArray(targetProfile.assigned_stores) ? targetProfile.assigned_stores : [];
        const updatedStores = existingStores.filter((name: string) => name !== storeName);

        const { error: updateError } = await supabaseAdmin
            .from('profiles').update({ assigned_stores: updatedStores }).eq('id', targetId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, message: 'Loja removida com sucesso' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
