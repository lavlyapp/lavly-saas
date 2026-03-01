import { NextResponse } from 'next/server';
import { runGlobalSync } from '@/lib/automation/sync-manager';
import { syncVMPaySales } from '@/lib/vmpay-client';
import { upsertSales } from '@/lib/persistence';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for Vercel Hobby

export async function GET(request: Request) {
    console.log("[Force API] Starting 180-day backfill...");
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 180);
        const records = await syncVMPaySales(startDate, endDate);
        console.log(`[Force API] Fetched ${records.length} historical records.`);
        const result = await upsertSales(records);
        return NextResponse.json({ success: true, count: records.length, result });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
