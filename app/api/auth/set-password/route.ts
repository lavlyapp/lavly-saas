import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { password } = body;

        if (!password) {
            return NextResponse.json({ success: false, error: 'Senha é obrigatória' }, { status: 400 });
        }

        const cookieStore = await cookies();
        
        // Use ANON client to get the current logged-in user
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

        // Use SERVICE ROLE client to update password without triggering user email rate limits
        const supabaseAdmin = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; }
                }
            }
        );

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: password,
            user_metadata: { force_password_change: null }
        });

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
