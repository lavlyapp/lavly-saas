import { NextResponse } from 'next/server';
import { runGlobalSync } from '@/lib/automation/sync-manager';
import { logActivity } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

// Aumenta o limite de 10s (default Hobby) para 60s — necessário para sync + refresh views
export const maxDuration = 60;

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

        // Upsert Customers into Supabase
        if (supabaseClient && customers.length > 0) {
            console.log(`[Cron API] Upserting ${customers.length} customers to database...`);
            const upsertPayload = customers.map(c => ({
                customer_id: c.id,
                name: c.name,
                phone: c.phone || null,
                email: c.email || null,
                cpf: c.cpf || null,
                gender: c.gender,
                registration_date: c.registrationDate ? c.registrationDate.toISOString() : null
            }));

            // Chunk upsert to avoid large payload errors
            const chunkSize = 500;
            for (let i = 0; i < upsertPayload.length; i += chunkSize) {
                const chunk = upsertPayload.slice(i, i + chunkSize);
                const { error: upsertError } = await supabaseClient
                    .from('customers')
                    .upsert(chunk, { onConflict: 'customer_id' });

                if (upsertError) {
                    console.error(`[Cron API] Error upserting customers chunk ${i}:`, upsertError.message);
                }
            }
            console.log(`[Cron API] Customers upsert completed.`);
        }

        // Refresh materialized views to ensure Financial Dashboard shows new sales immediately
        if (supabaseClient) {
            const { error: refreshError } = await supabaseClient.rpc('refresh_lavly_materialized_views');
            if (refreshError) {
                console.error(`[Cron API] Error refreshing materialized views: ${refreshError.message}`);
            } else {
                console.log(`[Cron API] Materialized views refreshed successfully.`);
            }
        }

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
