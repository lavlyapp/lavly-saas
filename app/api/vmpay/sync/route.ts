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
        const cnpj = searchParams.get('store') || searchParams.get('cnpj') || undefined;
        const force = searchParams.get('force') === 'true';
        const isManual = searchParams.get('manual') === 'true' || searchParams.get('isManual') === 'true';

        // We MUST use the service role key for cron jobs and background syncs
        // because RLS blocking will silently drop the sales but return success
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        console.log(`[VERCEL ENV DIAGNOSTIC] HAS_SERVICE_ROLE_KEY: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
        
        if (!supabaseKey) {
            throw new Error("supabaseKey is required but missing in Environment Variables.");
        }

        const supabaseClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            supabaseKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                    detectSessionInUrl: false
                }
            }
        );

        const debugLogs: string[] = [];
        const originalLog = console.log;
        const originalError = console.error;
        console.log = (...args) => { debugLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); originalLog(...args); };
        console.error = (...args) => { debugLogs.push('ERROR: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); originalError(...args); };

        let newSales: any[] = [];
        try {
           newSales = await runGlobalSync(isManual, force, supabaseClient, cnpj);
        } finally {
           console.log = originalLog;
           console.error = originalError;
        }

        // 2. Sync customers - REMOVED for performance, as requested

        // 3. Log the sync activity
        await logActivity("SYNC_VMPAY", null, {
            newSalesCount: newSales.length,
            message: `Sync completed successfully.`
        });

        return NextResponse.json({
            success: true,
            records: newSales,
            debug: debugLogs,
            message: `Sync completed. ${newSales.length} new sales processed.`
        });
    } catch (error: any) {
        console.error("[API] Sync Error:", error);
        return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
    }
}
