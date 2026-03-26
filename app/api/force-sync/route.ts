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

        const records = await syncVMPaySales(startDate, endDate);
        
        // SECURITY ISOLATION: Filter records to only include stores the user is assigned to!
        const { getVMPayCredentials, getCanonicalStoreName } = await import("@/lib/vmpay-config");
        const activeStores = await getVMPayCredentials(supabase);
        const configuredNames = activeStores.map(s => getCanonicalStoreName(s.name));
        
        const filteredRecords = records.filter(r => configuredNames.includes(r.loja));

        console.log(`[Force API] Fetched ${records.length} total, filtered down to ${filteredRecords.length} historical records for assigned stores.`);
        const result = await upsertSales(filteredRecords, supabase);

        if (!result || !result.success) {
            throw new Error(result?.error || "Unknown database error during upsert.");
        }

        return NextResponse.json({ success: true, count: filteredRecords.length, startDate, endDate, result });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
