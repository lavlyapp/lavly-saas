import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Usamos a chave de serviço para garantir que a atualização funcione 
// durante o processo de onboarding, onde o RLS poderia bloquear dependendo da config.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { storesData } = body;
        // Expected format: storesData = [{ name: 'Store A', cnpj: '123' }, ...]

        if (!Array.isArray(storesData) || storesData.length === 0) {
            return NextResponse.json({ error: 'Mande um array com as lojas e CNPJs' }, { status: 400 });
        }

        // Ideally, we should verify the JWT of the logged-in user to ensure they own these stores.
        // For security, checking if the provided auth headers match the profile.
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const supabaseClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: userData, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !userData.user) {
            return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
        }

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('assigned_stores')
            .eq('id', userData.user.id)
            .single();

        if (!profile || !profile.assigned_stores) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 });
        }

        const userStores = profile.assigned_stores as string[];

        let updatedCount = 0;

        for (const store of storesData) {
            const { name, cnpj } = store;

            // Security check: only allow updating CNPJ of assigned stores
            if (!userStores.includes(name)) {
                console.warn(`[Update CNPJ] Unauthorized attempt to update store: ${name} by user ${userData.user.id}`);
                continue;
            }

            // Remove formatting from CNPJ (keep only numbers)
            const cleanCnpj = cnpj.replace(/\D/g, '');

            if (cleanCnpj.length !== 14) {
                return NextResponse.json({ error: `O CNPJ da loja ${name} é inválido.` }, { status: 400 });
            }

            const { error: updateError } = await supabaseAdmin
                .from('stores')
                .update({ cnpj: cleanCnpj })
                .eq('name', name);

            if (updateError) {
                console.error(`[Update CNPJ] Error updating ${name}:`, updateError);
                return NextResponse.json({ error: `Erro ao atualizar a loja ${name}` }, { status: 500 });
            }
            updatedCount++;
        }

        return NextResponse.json({
            success: true,
            message: `${updatedCount} loja(s) atualizada(s) com sucesso.`,
        });

    } catch (error: any) {
        console.error('[Update CNPJ] Unexpected Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
