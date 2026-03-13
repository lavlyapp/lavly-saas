import { NextResponse } from 'next/server';
import { runGlobalSync } from '@/lib/automation/sync-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { logActivity } from '@/lib/logger';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const maxDuration = 300; // 5 minutes for Vercel Hobby

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const isManual = searchParams.get('source') === 'manual';
        const force = searchParams.get('force') === 'true';
        const cnpj = searchParams.get('cnpj') || undefined;

        // We MUST use the service role key for cron jobs and background syncs
        // because RLS blocking will silently drop the sales but return success
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseKey) {
            throw new Error("supabaseKey is required but missing in Environment Variables.");
        }

        const authHeader = request.headers.get('authorization');

        const supabaseClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            supabaseKey,
            {
                global: {
                    headers: authHeader ? { Authorization: authHeader } : {}
                }
            }
        );

        // 1. Run sync (checks hours, ac states, etc.)
        // Pass the authenticated client so sync-manager can use it for RLS-protected updates
        const newSales = await runGlobalSync(isManual, force, supabaseClient, cnpj);

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
