import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin, isAuthError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (isAuthError(auth)) return auth;
    try {
        // Use a direct query that might bypass some RLS if configured or just to see what the server sees
        const { data, error } = await supabase.from('stores').select('*');
        return NextResponse.json({ success: true, count: data?.length || 0, stores: data, error });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
