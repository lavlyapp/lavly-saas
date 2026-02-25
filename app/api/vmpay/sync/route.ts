import { NextResponse } from 'next/server';
import { runGlobalSync } from '@/lib/automation/sync-manager';
import { syncVMPayCustomers } from '@/lib/vmpay-client';
import { logActivity } from '@/lib/logger';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const isManual = searchParams.get('source') === 'manual';

        console.log(`[Sync API] 🚀 Triggering Global Adaptive Sync (Manual: ${isManual})...`);

        // 1. Run sync (checks hours, ac states, etc.)
        const newSales = await runGlobalSync(isManual);

        // 2. Sync customers to keep registry updated
        const customers = await syncVMPayCustomers();

        // 3. Log the sync activity
        await logActivity("SYNC_VMPAY", null, {
            newSalesCount: newSales.length,
            customersCount: customers.length,
            message: `Sync completed successfully.`
        });

        return NextResponse.json({
            success: true,
            records: newSales,
            customers: customers,
            message: `Sync completed. ${newSales.length} new sales, ${customers.length} customers processed.`
        });
    } catch (error: any) {
        console.error("[API] Sync Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
