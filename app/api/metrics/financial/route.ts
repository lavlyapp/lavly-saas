import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { startOfMonth, subMonths, endOfMonth, getDaysInMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'thisMonth';
        let store = searchParams.get('store') || 'Todas';
        const startCustom = searchParams.get('start');
        const endCustom = searchParams.get('end');

        // Create Authenticated Client ensuring RLS matches user
        const cookieStore = await cookies();
        const authHeader = request.headers.get('Authorization');
        
        let supabase;
        if (authHeader) {
            // Priority 1: Bearer Token (Dashboard)
            const { createClient } = await import('@supabase/supabase-js');
            supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { global: { headers: { Authorization: authHeader } } }
            );
        } else {
            // Priority 2: Cookies
            supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        getAll() { return cookieStore.getAll(); },
                        setAll(cookiesToSet) { }
                    }
                }
            );
        }

        // --- 1. Compute Date Boundaries in BRT (UTC-3) ---
        const now = new Date();
        const nowBrt = new Date(now.getTime() - (3 * 3600 * 1000));
        const yestBrt = new Date(nowBrt.getTime() - (24 * 3600 * 1000));
        
        const todayStr = nowBrt.toISOString().substring(0, 10);
        const yesterdayStr = yestBrt.toISOString().substring(0, 10);
        const targetMonthStr = todayStr.substring(0, 7);
        
        let lastMonthStr = new Date(nowBrt.getFullYear(), nowBrt.getMonth() - 1, 1).toISOString().substring(0, 7);
        if (period === 'lastMonth') {
            const m = nowBrt.getMonth();
            const y = m === 0 ? nowBrt.getFullYear() - 1 : nowBrt.getFullYear();
            const paddedM = m === 0 ? '12' : String(m).padStart(2, '0');
            lastMonthStr = `${y}-${paddedM}`;
        }

        let queryStartIso: string | null = null;
        let queryEndIso: string | null = null;

        // Convert boundary strings to ISO boundaries for PostgreSQL
        if (period === 'today') {
            queryStartIso = `${todayStr}T00:00:00.000Z`;
            queryEndIso = `${todayStr}T23:59:59.999Z`;
        } else if (period === 'yesterday') {
            queryStartIso = `${yesterdayStr}T00:00:00.000Z`;
            queryEndIso = `${yesterdayStr}T23:59:59.999Z`;
        } else if (period === 'thisMonth') {
            queryStartIso = `${targetMonthStr}-01T00:00:00.000Z`;
            queryEndIso = `${targetMonthStr}-31T23:59:59.999Z`;
        } else if (period === 'lastMonth') {
            queryStartIso = `${lastMonthStr}-01T00:00:00.000Z`;
            queryEndIso = `${lastMonthStr}-31T23:59:59.999Z`;
        } else if (period === 'custom' && startCustom && endCustom) {
            queryStartIso = `${startCustom}T00:00:00.000Z`;
            queryEndIso = `${endCustom}T23:59:59.999Z`;
        }

        // Force a tiny offset for BRT translation if we want pure matching, 
        // but since we query by absolute DB rows, let's pull loosely and filter perfectly in JS
        // to match 100% of the legacy frontend logic.
        if (queryStartIso) {
            // Expand pulling window to account for -3h BRT difference to prevent dropping edge records
            const startD = new Date(queryStartIso);
            startD.setHours(startD.getHours() - 4);
            queryStartIso = startD.toISOString();
            
            const endD = new Date(queryEndIso!);
            endD.setHours(endD.getHours() + 4);
            queryEndIso = endD.toISOString();
        }

        // --- 2. Fetch Data ---
        console.log(`[API Metrics] Fetching ${period} for ${store}...`);
        
        const applyFilters = (q: any) => {
            if (store !== 'Todas') q = q.eq('loja', store);
            if (queryStartIso && queryEndIso && period !== 'allTime') {
                q = q.gte('data', queryStartIso).lte('data', queryEndIso);
            }
            return q;
        };

        const fetchFiltered = async (table: string, columns: string) => {
            // First pass: Quick HEAD request to get exact bounds
            const qCount = applyFilters(supabase.from(table).select('*', { count: 'exact', head: true }));
            const { count, error: countErr } = await qCount;
            
            if (countErr) throw countErr;
            if (!count) return [];

            // Second pass: Fetch chunks in bounded parallel streams
            const allData: any[] = [];
            const limit = 1000;
            const numChunks = Math.ceil(count / limit);
            const maxConcurrency = 5; // Limita a 5 requisições paralelas para evitar Timeout/Error no Pool
            
            for (let i = 0; i < numChunks; i += maxConcurrency) {
                const promises = [];
                for (let j = 0; j < maxConcurrency && (i + j) < numChunks; j++) {
                    const offset = (i + j) * limit;
                    const qData = applyFilters(supabase.from(table).select(columns));
                    promises.push(qData.range(offset, offset + limit - 1));
                }
                
                const results = await Promise.all(promises);
                for (const res of results) {
                    if (res.error) throw res.error;
                    if (res.data) allData.push(...res.data);
                }
            }
            return allData;
        };

        const [rawSales, rawOrders] = await Promise.all([
            fetchFiltered('sales', 'id, data, loja, cliente, valor, forma_pagamento, tipo_cartao, categoria_voucher, desconto, produto'),
            fetchFiltered('orders', 'data, loja, machine, service, valor, sale_id')
        ]);

        // Exact Legacy Front-End Filter (JS Level UTC-3)
        const filterByBrt = (records: any[]) => records.filter((r: any) => {
            const dateVal = r.data || r.created_at;
            if (!dateVal) return false;
            
            const rTime = typeof dateVal === 'string' ? new Date(dateVal).getTime() : dateVal.getTime();
            const rBrt = new Date(rTime - (3 * 3600 * 1000));
            const dbDateStr = rBrt.toISOString().substring(0, 10);

            switch (period) {
                case 'today': return dbDateStr === todayStr;
                case 'yesterday': return dbDateStr === yesterdayStr;
                case 'thisMonth': return dbDateStr.startsWith(targetMonthStr);
                case 'lastMonth': return dbDateStr.startsWith(lastMonthStr);
                case 'custom': return dbDateStr >= startCustom! && dbDateStr <= endCustom!;
                case 'allTime': return true;
                default: return dbDateStr.startsWith(targetMonthStr);
            }
        });

        const filteredRecords = filterByBrt(rawSales);
        const filteredOrders = filterByBrt(rawOrders);

        // --- 3. Compute Metrics ---
        // A. Baskets
        let totalWashes = 0;
        let totalDries = 0;
        let totalOthers = 0;
        const unclassifiedList: string[] = [];

        filteredOrders.forEach((o: any) => {
            const service = (o.service || o.produto || '').toLowerCase();
            const machine = (o.machine || '').toLowerCase();

            let isWash = false;
            let isDry = false;

            if (machine.includes('secadora') || machine.includes('secar')) {
                isDry = true;
            } else if (machine.includes('lavadora') || machine.includes('lavar')) {
                isWash = true;
            }

            if (!isWash && !isDry) {
                if (service === 'lavagem' || service.includes('lavagem') || service.includes('lavar')) isWash = true;
                else if (service === 'secagem' || service.includes('secagem') || service.includes('secar')) isDry = true;
            }

            if (!isWash && !isDry) {
                const machineNumberMatch = machine.match(/\d+/);
                if (machineNumberMatch) {
                    const num = parseInt(machineNumberMatch[0], 10);
                    if (!isNaN(num)) {
                        if (num % 2 === 0) isWash = true;
                        else isDry = true;
                    }
                }
            }

            if (!isWash && !isDry) {
                if (service.includes('agua') || service.includes('lave') || service.includes('quente') || service.includes('frio') || service.includes('super') || service.includes('edredom') || service.includes('delicado')) {
                    isWash = true;
                } else if (service.includes('seque') || service.includes('vento') || service.includes('bem seco')) {
                    isDry = true;
                }
            }

            if (isWash) totalWashes++;
            else if (isDry) totalDries++;
            else {
                totalOthers++;
                if (unclassifiedList.length < 20) {
                    unclassifiedList.push(`${o.machine || 'NoMachine'} / ${o.service || o.produto || 'NoService'}`);
                }
            }
        });

        // B. Summary
        let minTime = Infinity;
        let maxTime = -Infinity;
        let totalValue = 0;
        const uniqueKeys = new Set();
        
        filteredRecords.forEach((r: any) => {
             const ts = new Date(r.data).getTime();
             if (ts < minTime) minTime = ts;
             if (ts > maxTime) maxTime = ts;
             totalValue += (r.valor || 0);
             uniqueKeys.add(r.cliente || 'Anonimo');
        });

        // C. Daily Data & Store Data
        const groupedDaily: Record<string, number> = {};
        const groupedStores: Record<string, number> = {};
        
        filteredRecords.forEach((r: any) => {
            const rTime = new Date(r.data).getTime();
            const rBrt = new Date(rTime - (3 * 3600 * 1000));
            const dbDateStr = rBrt.toISOString().substring(0, 10);
            const [y, m, d] = dbDateStr.split('-');
            const dateKey = `${d}/${m}/${y}`;
            groupedDaily[dateKey] = (groupedDaily[dateKey] || 0) + (r.valor || 0);
            
            const storeName = r.loja || 'Desconhecida';
            groupedStores[storeName] = (groupedStores[storeName] || 0) + (r.valor || 0);
        });

        const dailyData = Object.entries(groupedDaily).map(([date, value]) => ({ date, valor: value })).sort((a, b) => {
            const [d1, m1, y1] = a.date.split('/').map(Number);
            const [d2, m2, y2] = b.date.split('/').map(Number);
            return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
        });
        
        const storeData = Object.entries(groupedStores).map(([name, value]) => ({ name, valor: value })).sort((a, b) => b.valor - a.valor);

        // D. Payment Stats
        const paymentStats = { debit: 0, credit: 0, pix: 0, voucher: 0, voucherDetails: {} as Record<string, number>, coupons: 0, others: 0, otherTypes: [] as string[] };
        filteredRecords.forEach((r: any) => {
            const type = String(r.forma_pagamento || 'não identificado').toLowerCase();
            const cardType = String(r.tipo_cartao || '').toLowerCase();
            const voucherCat = String(r.categoria_voucher || 'Geral').trim();
            const value = r.valor || 0;

            if (type.includes('pix') || type.includes('qrcode')) paymentStats.pix += value;
            else if (type.includes('voucher') || type.includes('prepago') || type.includes('pre-pago') || type.includes('saldo')) {
                paymentStats.voucher += value;
                paymentStats.voucherDetails[voucherCat] = (paymentStats.voucherDetails[voucherCat] || 0) + value;
            } else if (type.includes('credito') || type.includes('crédito') || cardType.includes('credito') || cardType.includes('crédito') || type.includes('app') || type.includes('online')) {
                paymentStats.credit += value;
            } else if (type.includes('debito') || type.includes('débito') || cardType.includes('debito') || cardType.includes('débito') || type.includes('classico')) {
                paymentStats.debit += value;
            } else {
                paymentStats.others += value;
                const debugTag = `${r.forma_pagamento} [N:${r.tipo_cartao}]`;
                if (!paymentStats.otherTypes.includes(debugTag)) paymentStats.otherTypes.push(debugTag);
            }
            if (r.desconto > 0) paymentStats.coupons++;
        });

        // E. Global Metrics (Requires Last 30 Days even if looking at today)
        let last30DaysAvg = 0;
        let projection = 0;
        let daysInViewMonth = 30;
        
        // We do a specific separate quick-query for global averages to not inflate payload
        const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const applyGlobalFilters = (q: any) => store !== 'Todas' ? q.eq('loja', store).gte('data', thirtyDaysAgoIso) : q.gte('data', thirtyDaysAgoIso);

        const qCountGlobal = applyGlobalFilters(supabase.from('sales').select('*', { count: 'exact', head: true }));
        const { count: globalCount } = await qCountGlobal;
        
        let last30Revenue = 0;
        if (globalCount) {
            const limit = 1000;
            const numChunks = Math.ceil(globalCount / limit);
            const maxConcurrency = 3;
            for (let i = 0; i < numChunks; i += maxConcurrency) {
                const promises = [];
                for (let j = 0; j < maxConcurrency && (i + j) < numChunks; j++) {
                    const offset = (i + j) * limit;
                    const qData = applyGlobalFilters(supabase.from('sales').select('valor'));
                    promises.push(qData.range(offset, offset + limit - 1));
                }
                const results = await Promise.all(promises);
                for (const res of results) {
                    if (res.data) {
                        last30Revenue += res.data.reduce((acc: number, r: any) => acc + (r.valor || 0), 0);
                    }
                }
            }
        }
        last30DaysAvg = last30Revenue / 30;

        const viewDate = minTime !== Infinity ? new Date(minTime) : new Date();
        daysInViewMonth = getDaysInMonth(viewDate);
        projection = last30DaysAvg * daysInViewMonth;

        return NextResponse.json({
            success: true,
            payload: {
                summary: {
                    totalSales: filteredRecords.length,
                    totalValue,
                    startDate: minTime !== Infinity ? new Date(minTime).toISOString() : null,
                    endDate: maxTime !== -Infinity ? new Date(maxTime).toISOString() : null,
                    uniqueCustomers: uniqueKeys.size
                },
                basketsMetrics: {
                    totalBaskets: filteredOrders.length,
                    totalWashes,
                    totalDries,
                    totalOthers,
                    unclassifiedList
                },
                dailyData,
                storeData,
                uniqueStoreCount: new Set(filteredRecords.map(r => r.loja)).size,
                paymentStats,
                globalMetrics: {
                    last30DaysAvg,
                    projection,
                    daysInViewMonth
                }
            }
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
