import { NextResponse } from 'next/server';
import { fetchSalesHistory } from '@/lib/persistence';

export const dynamic = 'force-dynamic';
// Vercel Pro/Hobby limits: Usually 60s for Hobby, 300s for Pro. We request the max possible standard limit.
export const maxDuration = 60;

export async function GET() {
    try {
        console.log("[API/History] Fetching heavy sales history from server-side...");

        // Server-side fetch has higher limits and doesn't block the browser thread
        const history = await fetchSalesHistory();

        if (!history || !history.sales || history.sales.length === 0) {
            console.log("[API/History] No history found or timeout reached.");
            return NextResponse.json({ success: true, count: 0, sales: [], orders: [], customers: [] });
        }

        console.log(`[API/History] Successfully retrieved ${history.sales.length} sales. Sending payload...`);

        return NextResponse.json({
            success: true,
            count: history.sales.length,
            sales: history.sales,
            orders: history.orders,
            customers: history.customers || []
        });

    } catch (error: any) {
        console.error("[API/History] Fatal error fetching history:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
