import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
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

        const { data: { user } } = await supabaseAuth.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Forbidden: Admins only' }, { status: 403 });
        }

        const { data: logsData, error: logsError } = await supabaseAdmin
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (logsError) throw logsError;

        const userIds = Array.from(new Set((logsData || []).map(l => l.user_id).filter(Boolean)));
        let userMap = new Map();

        if (userIds.length > 0) {
            const { data: profilesData } = await supabaseAdmin
                .from('profiles')
                .select('id, email, role')
                .in('id', userIds);

            if (profilesData) {
                profilesData.forEach(p => userMap.set(p.id, { email: p.email, role: p.role }));
            }
        }

        const enrichedLogs = (logsData || []).map(log => ({
            ...log,
            profiles: userMap.get(log.user_id) || null
        }));

        return NextResponse.json({ success: true, data: enrichedLogs });
    } catch (e: any) {
        console.error("Admin Logs API Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
