import { NextResponse } from 'next/server';
import { calculateCrmMetrics } from '@/lib/processing/crm';
import { requireAuth, isAuthError } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // This route returns customer PII (phone + purchase history). Require auth
    // and scope results to the caller's own stores.
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');

        if (!name) {
            return NextResponse.json({ success: false, error: 'Name parameter is required' }, { status: 400 });
        }

        // Uses the service-role client from the auth context (RLS bypass) but only
        // AFTER restricting rows to the caller's assigned stores for non-admins.
        let query = auth.admin
            .from('sales')
            .select('id, data, loja, cliente, telefone, valor, produto')
            .ilike('cliente', name)
            .order('data', { ascending: false });

        if (auth.role !== 'admin') {
            if (!auth.assignedStores || auth.assignedStores.length === 0) {
                return NextResponse.json({ success: true, payload: null });
            }
            query = query.in('loja', auth.assignedStores);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!data || data.length === 0) {
            return NextResponse.json({ success: true, payload: null });
        }

        const parsedRecords = data.map(r => ({
            ...r,
            data: new Date(r.data),
            items: [] // No items column in Supabase sales table
        }));

        const metrics = calculateCrmMetrics(parsedRecords);
        const profile = metrics.profiles[0];

        return NextResponse.json({
             success: true, 
             payload: profile
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
