import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Revalidate 0 forces NextJS to never cache this endpoint
export const revalidate = 0;

export async function GET() {
    try {
        console.log("[API: /stores] Using ADMIN Service Key to bypass RLS read block...");
        const { data, error } = await supabaseAdmin
            .from('stores')
            .select('*')
            .order('name');

        if (error) {
            console.error('[API: /stores] RLS Bypass GET Fetch Failed:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        console.log(`[API: /stores] Using ADMIN Service Key for POST Upsert (${Array.isArray(body) ? body.length : 1} records)...`);

        const { data, error } = await supabaseAdmin
            .from('stores')
            .upsert(body, { onConflict: 'cnpj' })
            .select();

        if (error) {
            console.error('[API: /stores] RLS Bypass POST Failed:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing store ID' }, { status: 400 });
        }

        console.log(`[API: /stores] Using ADMIN Service Key for DELETE (${id})...`);

        const { error } = await supabaseAdmin
            .from('stores')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[API: /stores] RLS Bypass DELETE Failed:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
