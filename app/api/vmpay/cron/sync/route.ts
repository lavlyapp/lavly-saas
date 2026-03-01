import { NextResponse } from 'next/server';
import { runGlobalSync } from '@/lib/automation/sync-manager';
import { logActivity } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

// This endpoint is meant to be called by a CRON job (e.g. Vercel Cron or external service)
export async function GET(request: Request) {
    try {
        // Authenticate the cron request
        const authHeader = request.headers.get('Authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log(`[Cron API] 🚀 Triggering Daily Global Sync...`);

        // We use a Service Role client to bypass RLS since this is an automated task
        let supabaseClient: any = null;
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            supabaseClient = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
        } else {
            console.warn("[Cron API] SUPABASE_SERVICE_ROLE_KEY is perfectly missing. Falling back to ANON key (might fail RLS updates).");
        }

        // Run sync
        const newSales = await runGlobalSync(false, false, supabaseClient);

        // Sync customers as part of the daily routine
        const { syncVMPayCustomers } = await import('@/lib/vmpay-client');
        const customers = await syncVMPayCustomers();

        await logActivity("SYNC_VMPAY_CRON", null, {
            newSalesCount: newSales.length,
            customersCount: customers.length,
            message: `Automated Daily Sync completed successfully.`
        });

        return NextResponse.json({
            success: true,
            records: newSales.length,
            customers: customers.length,
            message: `Daily Sync completed.`
        });
    } catch (error: any) {
        console.error("[Cron API] Sync Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
