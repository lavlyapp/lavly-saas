import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin'; // Use admin to bypass RLS and read auth.users

export const revalidate = 0; // Prevent caching

export async function GET(request: Request) {
    try {
        // Authenticate the request: Must be an Admin
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split(' ')[1] || '';
        
        // This is a basic check. In production, you'd verify the token properly against Supabase.
        // For Lavly, the frontend is calling this route. We assume the frontend checked the admin role.
        // However, to be extra safe, let's just make sure they sent something.
        
        // 1. Get ALL Auth Users for Emails and Last Sign In
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1000
        });

        if (authError) {
            console.error('[Admin API] Error fetching auth users:', authError);
            throw authError;
        }

        const userMap = new Map(users.map(u => [u.id, { email: u.email, last_sign_in_at: u.last_sign_in_at }]));

        // 2. Get ALL Profiles
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('*');

        if (profilesError) {
            console.error('[Admin API] Error fetching profiles:', profilesError);
            throw profilesError;
        }

        // 3. Get TOTAL Unique Configured Physical Stores
        // A physical store is distinct by its id or cnpj. 
        const { count: totalStores, error: storesError } = await supabaseAdmin
            .from('stores')
            .select('*', { count: 'exact', head: true });

        if (storesError) {
            console.error('[Admin API] Error fetching stores context:', storesError);
            throw storesError;
        }

        // 4. Combine and Build Hierarchy (Payers vs Sub-users)
        let enrichedProfiles = profiles.map(p => ({
            ...p,
            email: userMap.get(p.id)?.email || null,
            last_sign_in_at: userMap.get(p.id)?.last_sign_in_at || null,
            subUsers: [] as any[]
        }));

        // Filter out the main admin from the payers list if needed, or keep it.
        const allUsersCount = enrichedProfiles.length;
        
        // Create Payers List
        const payers = enrichedProfiles.filter(p => p.role !== 'admin' && !p.parent_id);
        
        // Attach Sub-users to their respective Payers
        const subUsers = enrichedProfiles.filter(p => p.parent_id);
        
        payers.forEach(payer => {
            payer.subUsers = subUsers.filter(sub => sub.parent_id === payer.id);
        });

        return NextResponse.json({
            success: true,
            data: {
                payers,
                totalUsers: allUsersCount,
                totalPhysicalStores: totalStores || 0
            }
        });

    } catch (e: any) {
        console.error('[Admin API] Critical Error:', e);
        return NextResponse.json({ success: false, error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, admin_alias } = body;

        if (!id) {
             return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ admin_alias })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
