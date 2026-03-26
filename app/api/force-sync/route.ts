import { NextResponse } from 'next/server';
import { syncVMPaySales } from '@/lib/vmpay-client';
import { upsertSales } from '@/lib/persistence';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for Vercel Hobby

export async function GET(request: Request) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                }
            }
        }
    );

    const { searchParams } = new URL(request.url);
    const chunkDays = parseInt(searchParams.get('chunk') || "15");
    const offsetDays = parseInt(searchParams.get('offset') || "0");

    console.log(`[Force API] Chunk: ${chunkDays} days, offset: ${offsetDays}...`);
    try {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - offsetDays);

        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - chunkDays);

        // SECURITY ISOLATION: Fetch credentials specifically for the authenticated user
        const { getVMPayCredentials, getCanonicalStoreName } = await import("@/lib/vmpay-config");
        const activeStores = await getVMPayCredentials(supabase);
        
        if (activeStores.length === 0) {
            return NextResponse.json({ success: true, count: 0, startDate, endDate });
        }

        const configuredNames = activeStores.map(s => getCanonicalStoreName(s.name));
        let allFilteredRecords: any[] = [];
        
        // Pass specific credential array sequentially to restrict VMPay API fetch strictly to allowed stores
        for (const storeCred of activeStores) {
            const records = await syncVMPaySales(startDate, endDate, storeCred);
            allFilteredRecords.push(...records);
        }

        console.log(`[Force API] Fetched ${allFilteredRecords.length} historical records for assigned stores.`);
        const result = await upsertSales(allFilteredRecords, supabase);

        // upsertSales returns undefined if records length is 0, handle it gracefully
        if (allFilteredRecords.length > 0 && (!result || !result.success)) {
            const rawError = result ? JSON.stringify(result) : "Result is undefined";
            throw new Error(`Data Insert Error: ${result?.error || rawError}`);
        }

        return NextResponse.json({ success: true, count: allFilteredRecords.length, startDate, endDate, result });
    } catch (e: any) {
        console.error("[Force API] Caught Exception:", e);
        return NextResponse.json({ success: false, error: e.message || String(e) });
    }
}
