import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
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
