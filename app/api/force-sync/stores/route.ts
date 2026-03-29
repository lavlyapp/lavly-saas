import { NextResponse } from 'next/server';
import { getVMPayCredentials } from '@/lib/vmpay-config';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; }
                }
            }
        );
        
        const activeStores = await getVMPayCredentials(supabase);
        // Only return safe metadata to the frontend
        const safeStores = activeStores.map(s => ({ name: s.name, cnpj: s.cnpj }));
        
        return NextResponse.json({ success: true, stores: safeStores });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
