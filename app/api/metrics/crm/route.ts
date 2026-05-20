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
        let startCustom = searchParams.get('start');
        let endCustom = searchParams.get('end');
        
        // Clean up weird browser serialization artifacts
        if (startCustom === 'undefined' || startCustom === 'null' || startCustom === '') startCustom = null;
        if (endCustom === 'undefined' || endCustom === 'null' || endCustom === '') endCustom = null;

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
            if (startCustom && startCustom.length === 10) {
                 queryStartIso = `${startCustom}T00:00:00.000Z`;
            }
            if (endCustom && endCustom.length === 10) {
                 queryEndIso = `${endCustom}T23:59:59.999Z`;
            }
        }

        // 2. Edge Direct Fetch logic using V19 Schema
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_crm_backend_metrics', {
            p_store: store,
            p_start_date: queryStartIso,
            p_end_date: queryEndIso
        });

        let usedFallback = false;
        let fbGlobal, fbFiltered, fbPeriod, fbDemographics, fbHeatmap;

        if (rpcError || !rpcData) {
            console.warn("[API CRM] RPC Error (Ambiguous Column or Missing). Starting JS Fallback...", rpcError?.message);
            usedFallback = true;
            console.time('[API CRM] Fallback Data Fetch');
            let q = supabase.from('sales').select('*');
            if (store !== 'Todas') {
                q = q.eq('loja', store);
            }
            
            // Bring customers to get the genders
            let qCust = supabase.from('customers').select('*');

            const [ { data: salesRaw, error: sErr }, { data: custRaw } ] = await Promise.all([q, qCust]);
            console.timeEnd('[API CRM] Fallback Data Fetch');

            if (sErr) throw new Error(sErr.message);

            console.time('[API CRM] Fallback JS Calculation');
            const { calculateCrmMetrics, calculatePeriodStats, calculateVisitsHeatmap } = await import('@/lib/processing/crm');
            
            fbGlobal = calculateCrmMetrics(salesRaw || [], custRaw || []);
            
            let filtered = salesRaw || [];
            if (queryStartIso && queryEndIso) {
                const sD = new Date(queryStartIso);
                const eD = new Date(queryEndIso);
                filtered = filtered.filter((s: any) => {
                    const d = new Date(s.data);
                    return d >= sD && d <= eD;
                });
            }
            
            fbFiltered = calculateCrmMetrics(filtered, custRaw || []);
            fbPeriod = calculatePeriodStats(filtered, salesRaw || []);
            fbHeatmap = calculateVisitsHeatmap(filtered);
            
            const { calculateDemographics } = await import('@/lib/processing/crm_edge_adapter');
            fbDemographics = calculateDemographics(fbGlobal.profiles);
            console.timeEnd('[API CRM] Fallback JS Calculation');
        }

        let globalMetrics, filteredMetrics, periodStats, visitsHeatmapData, demographicsStats;

        if (usedFallback) {
            globalMetrics = fbGlobal;
            filteredMetrics = fbFiltered;
            periodStats = fbPeriod;
            visitsHeatmapData = fbHeatmap;
            demographicsStats = fbDemographics;
        } else {
            console.time('[API CRM] Processing Edge JSON Rehydration');
            
            const { rehydrateCrmMetrics, rehydratePeriodStats, calculateDemographics } = await import('@/lib/processing/crm_edge_adapter');

            globalMetrics = rehydrateCrmMetrics(rpcData.globalProfiles);
            filteredMetrics = rehydrateCrmMetrics(rpcData.periodProfiles);
            periodStats = rehydratePeriodStats(rpcData.periodProfiles, rpcData.globalProfiles);
            
            // Heatmap Translation
            visitsHeatmapData = Array.from({length: 7}, () => Array(24).fill(0));
            rpcData.heatmap?.forEach((h: any) => {
                if(h.dow >= 0 && h.dow < 7 && h.hod >= 0 && h.hod < 24){
                     visitsHeatmapData[h.dow][h.hod] = h.count;
                }
            });

            // Compute Demographics server-side to save browser CPU and bandwidth
            demographicsStats = calculateDemographics(globalMetrics.profiles);
            console.timeEnd('[API CRM] Processing Edge JSON Rehydration');
        }

        // Strip heavy arrays to optimize JSON transfer for the filtered metrics, but keep global full for Churn analysis
        const lightGlobal = { ...globalMetrics }; 
        const lightFiltered = { ...filteredMetrics, profiles: [] };

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
