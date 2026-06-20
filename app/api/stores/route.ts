import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';

// Revalidate 0 forces NextJS to never cache this endpoint
export const revalidate = 0;

export async function GET(request: Request) {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    try {
        let query = auth.admin.from('stores').select('*').order('name');

        // Tenant isolation: a non-admin only sees the stores assigned to them.
        if (auth.role !== 'admin') {
            if (!auth.assignedStores || auth.assignedStores.length === 0) {
                return NextResponse.json({ success: true, data: [] });
            }
            query = query.in('name', auth.assignedStores);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[API: /stores] GET Failed:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    try {
        const body = await request.json();
        const records = Array.isArray(body) ? body : [body];

        // Tenant isolation: a non-admin may only upsert stores assigned to them.
        if (auth.role !== 'admin') {
            const allowed = new Set(auth.assignedStores || []);
            const forbidden = records.find((r: any) => !allowed.has(r?.name));
            if (forbidden) {
                return NextResponse.json(
                    { success: false, error: 'Você só pode editar lojas atribuídas à sua conta.' },
                    { status: 403 }
                );
            }
        }

        const { data, error } = await auth.admin
            .from('stores')
            .upsert(records, { onConflict: 'cnpj' })
            .select();

        if (error) {
            console.error('[API: /stores] POST Failed:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing store ID' }, { status: 400 });
        }

        // Tenant isolation: a non-admin may only delete a store assigned to them.
        if (auth.role !== 'admin') {
            const { data: store } = await auth.admin.from('stores').select('name').eq('id', id).single();
            if (!store || !(auth.assignedStores || []).includes(store.name)) {
                return NextResponse.json(
                    { success: false, error: 'Você só pode excluir lojas atribuídas à sua conta.' },
                    { status: 403 }
                );
            }
        }

        const { error } = await auth.admin.from('stores').delete().eq('id', id);
        if (error) {
            console.error('[API: /stores] DELETE Failed:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
