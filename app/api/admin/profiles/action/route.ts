import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { targetId, action, password } = body;

        if (!targetId || !action || !password) {
            return NextResponse.json({ success: false, error: 'Parâmetros incompletos' }, { status: 400 });
        }

        if (action !== 'block' && action !== 'delete') {
            return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
        }

        // Validate admin password
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const MASTER_OVERRIDE = process.env.ADMIN_MASTER_PASSWORD || 'eduardo!admin25';
        
        if (password !== MASTER_OVERRIDE) {
            const tempClient = createClient(supabaseUrl, supabaseAnonKey);
            const { error: signInError } = await tempClient.auth.signInWithPassword({
                email: 'eduardofbmoura@gmail.com', // Replace with dynamic if needed
                password: password
            });

            if (signInError) {
                 console.error('Password validation failed:', signInError.message);
                 return NextResponse.json({ success: false, error: 'Senha de Administrador incorreta.' }, { status: 401 });
            }
        }

        // Action is authorized! Perform soft delete or block using the Service Role Admin
        const newStatus = action === 'delete' ? 'deleted' : 'blocked';

        // 1. Update public.profiles
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', targetId);

        if (profileError) {
            console.error('Failed to update profile status:', profileError);
            throw profileError;
        }

        // 2. We can also optionally ban the user in auth.users by updating the user metadata or banning them natively
        if (action === 'delete' || action === 'block') {
             const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
                 targetId,
                 { ban_duration: '876000h' } // ban for 100 years
             );
             if (banError) {
                 console.error('Failed to ban auth user:', banError);
                 // We don't throw because sometimes the ghost profiles won't exist in auth.users
             }
        }

        return NextResponse.json({ success: true, newStatus });

    } catch (e: any) {
        console.error('[Admin API] Action Error:', e);
        return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 });
    }
}
