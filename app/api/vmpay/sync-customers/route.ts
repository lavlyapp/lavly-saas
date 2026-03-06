import { NextResponse } from 'next/server';
import { getVMPayCredentials } from '@/lib/vmpay-config';
import { syncVMPayCustomers } from '@/lib/vmpay-client';
import { upsertCustomers } from '@/lib/persistence';
import { createClient } from '@supabase/supabase-js';
import { logActivity } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes for Vercel

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Ensure only authorized requests or cron schedules can run this
        // In this implementation, we allow anyone with the URL for now,
        // or we could check an Authorization header.

        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseKey) {
            throw new Error("Missing Supabase Keys");
        }

        const supabaseClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            supabaseKey
        );

        const credentials = await getVMPayCredentials();
        let totalCustomersMerged = 0;
        const results = [];

        console.log(`[Customer Sync] Downloading customers from all stores...`);
        const customers = await syncVMPayCustomers();

        if (customers && customers.length > 0) {
            // Upsert to Supabase
            await upsertCustomers(customers, supabaseClient);
            totalCustomersMerged = customers.length;
            results.push({ store: "Todas as Lojas", count: customers.length });
        }

        await logActivity("SYNC_VMPAY" as any, null, {
            message: `Sincronização de Cadastros concluída. ${totalCustomersMerged} clientes processados.`,
            details: results
        });

        return NextResponse.json({
            success: true,
            total: totalCustomersMerged,
            details: results,
            message: `Sincronização de ${totalCustomersMerged} cadastros concluída com sucesso.`
        });

    } catch (error: any) {
        console.error("[Customer Sync] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
