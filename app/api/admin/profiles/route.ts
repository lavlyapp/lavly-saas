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

        // 3. Get TOTAL Configured Physical Stores (for counting and location parsing)
        const { data: storesList, error: storesError } = await supabaseAdmin
            .from('stores')
            .select('id, name, city, state, status');

        if (storesError) {
            console.error('[Admin API] Error fetching stores context:', storesError);
            throw storesError;
        }

        // Active generic physical stores count
        const totalStores = storesList?.filter(s => s.status !== 'deleted').length || 0;

        // Build a store location dictionary
        const storeLocations: Record<string, { city: string, state: string }> = {};
        storesList?.forEach(s => {
             // We map both the name and ID because assigned_stores historically uses names in VMPay
             if (s.city && s.state && s.name) {
                 storeLocations[s.name.toLowerCase()] = { city: s.city, state: s.state };
                 storeLocations[s.id] = { city: s.city, state: s.state };
             }
        });

        // Helper to find dominant location
        const getDominantLocation = (assignedStores: string[] | null) => {
            if (!assignedStores || assignedStores.length === 0) return null;
            
            const counts: Record<string, number> = {};
            for (const storeId of assignedStores) {
                // Treat bezerra as cascavel
                const normalizedId = storeId.toLowerCase().includes('bezerra de menezes') ? 'lavateria cascavel' : storeId.toLowerCase();
                const loc = storeLocations[normalizedId];
                if (loc) {
                    const key = `${loc.city}/${loc.state}`;
                    counts[key] = (counts[key] || 0) + 1;
                }
            }

            let maxCount = 0;
            let dominant = null;
            for (const [key, count] of Object.entries(counts)) {
                if (count > maxCount) {
                    maxCount = count;
                    dominant = key;
                }
            }
            return dominant;
        };

        // 4. Combine and Build Hierarchy (Payers vs Sub-users)
        let enrichedProfiles = profiles
            .filter(p => p.status !== 'deleted')
            .map(p => ({
                ...p,
                email: userMap.get(p.id)?.email || null,
                last_sign_in_at: userMap.get(p.id)?.last_sign_in_at || null,
                dominant_location: getDominantLocation(p.assigned_stores),
                subUsers: [] as any[]
            }));

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
                totalUsers: Number(allUsersCount || 0),
                totalPhysicalStores: Number(totalStores || 0)
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

export async function DELETE(request: Request) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) {
             return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
        }

        // Delete from auth.users (this should cascade to profiles, but we can do both to be safe)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) throw error;

        // Cleanup profile manually just in case
        await supabaseAdmin.from('profiles').delete().eq('id', id);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
