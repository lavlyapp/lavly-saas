import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { calculateCrmMetrics, calculatePeriodStats, calculateVisitsHeatmap } from '@/lib/processing/crm';
import { SaleRecord } from '@/lib/processing/etl';

export const runtime = 'nodejs'; // Use Node instead of edge for V8 memory limits handling 42k arrays
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'thisMonth';
        const store = searchParams.get('store') || 'Todas';
        const startCustom = searchParams.get('start');
        const endCustom = searchParams.get('end');

        // Auth
        const cookieStore = await cookies();
        const authHeader = request.headers.get('Authorization');

        let supabase;
        if (authHeader) {
            const { createClient } = await import('@supabase/supabase-js');
            supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: authHeader } } });
        } else {
            supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } });
        }

        console.time('[API CRM] Total Execution');
        console.time('[API CRM] Fetching Data');

        // 1. Convert period logic to ISO formats for PostgreSQL
        const nowBrt = new Date(Date.now() - (3 * 3600 * 1000));
        const todayStr = nowBrt.toISOString().substring(0, 10);
        const yestBrt = new Date(nowBrt.getTime() - (24 * 3600 * 1000));
        const yesterdayStr = yestBrt.toISOString().substring(0, 10);
        
        let queryStartIso = null;
        let queryEndIso = null;
        
        if (period === 'today') {
            queryStartIso = `${todayStr}T00:00:00.000Z`;
            queryEndIso = `${todayStr}T23:59:59.999Z`;
        } else if (period === 'yesterday') {
            queryStartIso = `${yesterdayStr}T00:00:00.000Z`;
            queryEndIso = `${yesterdayStr}T23:59:59.999Z`;
        } else if (period === 'thisMonth') {
            const y = nowBrt.getFullYear();
            const m = String(nowBrt.getMonth() + 1).padStart(2, '0');
            queryStartIso = `${y}-${m}-01T00:00:00.000Z`;
            queryEndIso = `${todayStr}T23:59:59.999Z`;
        } else if (period === 'lastMonth') {
            let m = nowBrt.getMonth();
            let y = nowBrt.getFullYear();
            if (m === 0) { m = 12; y -= 1; }
            const mStr = String(m).padStart(2, '0');
            const endOfDayLastMonth = new Date(y, m, 0, 23, 59, 59);
            queryStartIso = `${y}-${mStr}-01T00:00:00.000Z`;
            queryEndIso = endOfDayLastMonth.toISOString();
        } else if (period === 'custom') {
            queryStartIso = startCustom ? `${startCustom}T00:00:00.000Z` : null;
            queryEndIso = endCustom ? `${endCustom}T23:59:59.999Z` : null;
        }

        // 2. Edge Direct Fetch logic using V19 Schema
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_crm_backend_metrics', {
            p_store: store,
            p_start_date: queryStartIso,
            p_end_date: queryEndIso
        });

        if (rpcError || !rpcData) {
            console.error("[API CRM] RPC Error:", rpcError);
            throw new Error(rpcError?.message || "Função RPC get_crm_backend_metrics não instalada no BD!");
        }

        console.time('[API CRM] Processing Edge JSON Rehydration');
        
        const { rehydrateCrmMetrics, rehydratePeriodStats, calculateDemographics } = await import('@/lib/processing/crm_edge_adapter');

        const globalMetrics = rehydrateCrmMetrics(rpcData.globalProfiles);
        const filteredMetrics = rehydrateCrmMetrics(rpcData.periodProfiles);
        const periodStats = rehydratePeriodStats(rpcData.periodProfiles);
        
        // Heatmap Translation
        let visitsHeatmapData = Array.from({length: 7}, () => Array(24).fill(0));
        rpcData.heatmap?.forEach((h: any) => {
            if(h.dow >= 0 && h.dow < 7 && h.hod >= 0 && h.hod < 24){
                 visitsHeatmapData[h.dow][h.hod] = h.count;
            }
        });

        // Compute Demographics server-side to save browser CPU and bandwidth
        const demographicsStats = calculateDemographics(globalMetrics.profiles);

        // Strip heavy arrays to optimize JSON transfer
        const lightGlobal = { ...globalMetrics, profiles: globalMetrics.profiles.slice(0, 50) }; 
        const lightFiltered = { ...filteredMetrics, profiles: [] };

        console.timeEnd('[API CRM] Processing Edge JSON Rehydration');
        console.timeEnd('[API CRM] Total Execution');

        return NextResponse.json({
            success: true,
            payload: {
                globalMetrics: lightGlobal,
                filteredMetrics: lightFiltered,
                periodStats,
                visitsHeatmapData,
                demographics: demographicsStats
            }
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
