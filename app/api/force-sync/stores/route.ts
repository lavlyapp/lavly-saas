import { NextResponse } from 'next/server';
import { getVMPayCredentials, getCanonicalStoreName } from '@/lib/vmpay-config';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const supabaseService = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; }
                }
            }
        );

        const supabaseAuth = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; }
                }
            }
        );
        
        const activeStores = await getVMPayCredentials(supabaseService);

        // Fetch profiles to map owners for admin
        const { data: { user } } = await supabaseAuth.auth.getUser();
        let isAdmin = false;
        if (user) {
            const { data: profile } = await supabaseService.from('profiles').select('role').eq('id', user.id).single();
            if (profile && profile.role === 'admin') isAdmin = true;
        }

        let storeOwnerMap: Record<string, string> = {};
        if (isAdmin) {
            const { data: allProfiles } = await supabaseService.from('profiles').select('admin_alias, email, assigned_stores');
            if (allProfiles) {
                for (const p of allProfiles) {
                    const ownerName = p.admin_alias || p.email || 'Desconhecido';
                    if (p.assigned_stores && Array.isArray(p.assigned_stores)) {
                        for (const sName of p.assigned_stores) {
                            if (typeof sName === 'string') {
                                storeOwnerMap[getCanonicalStoreName(sName)] = ownerName;
                            }
                        }
                    }
                }
            }
        }

        // Only return safe metadata to the frontend
        const safeStores = activeStores.map(s => ({ 
            name: s.name, 
            cnpj: s.cnpj,
            owner: isAdmin ? (storeOwnerMap[getCanonicalStoreName(s.name)] || 'Outros') : undefined
        }));
        
        return NextResponse.json({ success: true, stores: safeStores });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
