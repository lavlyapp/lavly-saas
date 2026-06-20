import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { password, clearFlagOnly } = body;

        if (!clearFlagOnly && !password) {
            return NextResponse.json({ success: false, error: 'Senha é obrigatória' }, { status: 400 });
        }

        const cookieStore = await cookies();

        const supabaseAuth = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; }
                }
            }
        );

        const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 });
        }

        const { createClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // When clearFlagOnly=true the password was already changed client-side (supabase.auth.updateUser),
        // so we only need to clear the force_password_change flag via admin.
        const updatePayload: Record<string, any> = { user_metadata: { force_password_change: null } };
        if (!clearFlagOnly) {
            updatePayload.password = password;
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, updatePayload);

        if (updateError) {
            console.error("Admin Update Error:", updateError);
            return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("Set password API Error:", e);
        return NextResponse.json({ success: false, error: e.message || 'Erro interno no servidor' }, { status: 500 });
    }
}
