import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const supabaseAuth = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
        );

        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: callerProfile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (callerProfile?.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Acesso negado.' }, { status: 403 });
        }

        const { targetId, newPassword } = await req.json();

        if (!targetId || !newPassword || newPassword.length < 8) {
            return NextResponse.json({ success: false, error: 'ID do usuário e senha (mín. 8 chars) são obrigatórios.' }, { status: 400 });
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
            password: newPassword,
            user_metadata: { force_password_change: true }
        });

        if (updateError) {
            return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
