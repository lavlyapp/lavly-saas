import { NextResponse } from 'next/server';
import { runGlobalSync } from '@/lib/automation/sync-manager';
import { logActivity } from '@/lib/logger';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const isManual = searchParams.get('source') === 'manual';
        const force = searchParams.get('force') === 'true';

        // Retrieve token from Authorization header (sent by the frontend)
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        console.log(`[Sync API] 🚀 Triggering Global Adaptive Sync (Manual: ${isManual})...`);

        // Create an authenticated Supabase client to perform the updates
        const cookieStore = await cookies();
        let supabaseClient: any = null;

        if (token) {
            // Initialize with the user's token so RLS policies pass
            const { createClient } = await import('@supabase/supabase-js');
            supabaseClient = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    global: {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                }
            );
        }

        // 1. Run sync (checks hours, ac states, etc.)
        // Pass the authenticated client so sync-manager can use it for RLS-protected updates
        const newSales = await runGlobalSync(isManual, force, supabaseClient);

        // 2. Sync customers - REMOVED for performance, as requested

        // 3. Log the sync activity
        await logActivity("SYNC_VMPAY", null, {
            newSalesCount: newSales.length,
            message: `Sync completed successfully.`
        });

        return NextResponse.json({
            success: true,
            records: newSales,
            message: `Sync completed. ${newSales.length} new sales processed.`
        });
    } catch (error: any) {
        console.error("[API] Sync Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
