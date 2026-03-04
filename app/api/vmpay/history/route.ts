import { NextResponse } from 'next/server';
import { fetchSalesHistory } from '@/lib/persistence';
import { getVMPayCredentials } from '@/lib/vmpay-config';

export const dynamic = 'force-dynamic';
// Vercel Pro/Hobby limits: Usually 60s for Hobby, 300s for Pro. We request the max possible standard limit.
export const maxDuration = 60;

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        console.log("[API/History] Fetching heavy sales history from server-side...");

        let supabaseClient: any = null;
        if (token) {
            console.log("[API/History] Auth token found. Initializing authenticated Supabase client...");
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
        } else {
            console.warn("[API/History] No Auth token provided. This might result in 0 records due to RLS.");
        }

        // Server-side fetch has higher limits and doesn't block the browser thread
        // Pass the authenticated client so fetchSalesHistory handles RLS correctly
        const history = await fetchSalesHistory(supabaseClient);

        // Fetch active stores from DB (or fallback) to debug in UI
        const activeStores = await getVMPayCredentials();

        return NextResponse.json({
            success: true,
            count: history.sales.length,
            sales: history.sales,
            orders: history.orders,
            customers: history.customers || [],
            activeStores: activeStores.map(s => ({ name: s.name, cnpj: s.cnpj, is_active: s.is_active })),
            debug: {
                hasToken: !!token,
                salesCount: (history.sales || []).length,
                ordersCount: (history.orders || []).length,
                customersCount: (history.customers || []).length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error("[API/History] Fatal error fetching history:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
