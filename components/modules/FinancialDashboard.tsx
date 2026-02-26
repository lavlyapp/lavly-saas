'use client';

import { useMemo, useState, useEffect } from 'react';
import { ArrowUpRight, DollarSign, Calendar, TrendingUp, CreditCard, Filter, Users, Activity, BarChart3, ShoppingBasket, Waves, Wind } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, format, getDaysInMonth, differenceInCalendarDays } from 'date-fns';
import { MachineMonitor } from './MachineMonitor';
import { calculateCrmMetrics, calculateVisitCount } from '@/lib/processing/crm';
import { useAuth } from '@/components/context/AuthContext';

// Add OrderRecord type or import if shared (currently relying on any for data.orders)
// Better to import OrderRecord from etl if possible, but let's stick to props interface for now.

interface FinancialDashboardProps {
    data: {
        records: any[];
        orders?: any[]; // New: Orders list
        summary: any;
        errors?: any[];
        logs?: any[];
    };
    selectedStore?: string;
}

type PeriodOption = 'today' | 'yesterday' | 'thisMonth' | 'lastMonth' | 'custom' | 'allTime';

export function FinancialDashboard({ data, selectedStore = 'Todas' }: FinancialDashboardProps) {
    const { role } = useAuth();

    // --- State for Filters ---
    // --- Smart Date Initialization (Lazy State) ---
    const [period, setPeriod] = useState<PeriodOption>(() => {
        if (role === 'attendant') return 'today';
        if (!data?.records || data.records.length === 0) return 'thisMonth';

        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);

        // Check for data in current month
        const hasDataThisMonth = data.records.some((r: any) => {
            const d = new Date(r.data);
            return d >= startOfCurrentMonth && d <= endOfMonth(now);
        });

        if (hasDataThisMonth) return 'thisMonth';

        // If no data this month, but we have data, maybe 'allTime' is better than 'custom' for initial view?
        // Or check if Last Month has data?
        const startOfLastMonth = startOfMonth(subMonths(now, 1));
        const hasDataLastMonth = data.records.some((r: any) => {
            const d = new Date(r.data);
            return d >= startOfLastMonth && d <= endOfMonth(subMonths(now, 1));
        });

        if (hasDataLastMonth) return 'lastMonth';

        return 'allTime';
    });

    const [customRange, setCustomRange] = useState(() => {
        const defaultRange = {
            start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
            end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
        };

        if (!data?.records || data.records.length === 0) return defaultRange;

        // Default custom range to min/max of dataset if exists
        const timestamps = data.records.map((r: any) => new Date(r.data).getTime());
        if (timestamps.length > 0) {
            // Safe max/min finding for large arrays to avoid Maximum Call Stack Size Exceeded
            let minTs = timestamps[0];
            let maxTs = timestamps[0];
            for (let i = 1; i < timestamps.length; i++) {
                if (timestamps[i] < minTs) minTs = timestamps[i];
                if (timestamps[i] > maxTs) maxTs = timestamps[i];
            }
            const minDate = new Date(minTs);
            const maxDate = new Date(maxTs);
            return {
                start: format(minDate, 'yyyy-MM-dd'),
                end: format(maxDate, 'yyyy-MM-dd')
            };
        }

        return defaultRange;
    });

    // Removed useEffect that caused race conditions
    // const [hasAutoSelected, setHasAutoSelected] = useState(false);


    // --- Filter Logic ---
    const filteredRecords = useMemo(() => {
        if (!data?.records) return [];

        const now = new Date();
        let interval: { start: Date; end: Date } | null = null;

        switch (period) {
            case 'today':
                interval = { start: startOfDay(now), end: endOfDay(now) };
                break;
            case 'yesterday':
                const yesterday = subDays(now, 1);
                interval = { start: startOfDay(yesterday), end: endOfDay(yesterday) };
                break;
            case 'thisMonth':
                interval = { start: startOfMonth(now), end: endOfMonth(now) };
                break;
            case 'lastMonth':
                const lastMonth = subMonths(now, 1);
                interval = { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
                break;
            case 'custom':
                interval = {
                    start: startOfDay(new Date(customRange.start)),
                    end: endOfDay(new Date(customRange.end))
                };
                break;
            case 'allTime':
                interval = null; // No filter
                break;
            default:
                interval = { start: startOfMonth(now), end: endOfMonth(now) };
        }

        if (!interval) return data.records;

        return data.records.filter((r: any) => {
            if (!r.data) return false;
            // OPTIMIZATION: Assume r.data is already a Date or handle it safely
            const recordDate = r.data instanceof Date ? r.data : new Date(r.data);
            return recordDate >= interval!.start && recordDate <= interval!.end;
        });
    }, [data?.records, period, customRange]);

    // --- ORDERS FILTER Logic (Duplicate of Sales Filter for now) ---
    const filteredOrders = useMemo(() => {
        if (!data?.orders) return [];

        const now = new Date();
        let interval: { start: Date; end: Date } | null = null;

        switch (period) {
            case 'today':
                interval = { start: startOfDay(now), end: endOfDay(now) };
                break;
            case 'yesterday':
                const yesterday = subDays(now, 1);
                interval = { start: startOfDay(yesterday), end: endOfDay(yesterday) };
                break;
            case 'thisMonth':
                interval = { start: startOfMonth(now), end: endOfMonth(now) };
                break;
            case 'lastMonth':
                const lastMonth = subMonths(now, 1);
                interval = { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
                break;
            case 'custom':
                interval = {
                    start: startOfDay(new Date(customRange.start)),
                    end: endOfDay(new Date(customRange.end))
                };
                break;
            case 'allTime':
                interval = null;
                break;
            default:
                interval = { start: startOfMonth(now), end: endOfMonth(now) };
        }

        if (!interval) return data.orders;

        return data.orders.filter((o: any) => {
            if (!o.data) return false;
            // OPTIMIZATION: Assume o.data is already a Date or handle it safely
            const recordDate = o.data instanceof Date ? o.data : new Date(o.data);
            return recordDate >= interval!.start && recordDate <= interval!.end;
        });
    }, [data?.orders, period, customRange]);



    // --- Metrics Calculations
    const basketsMetrics = useMemo(() => {
        let totalBaskets = 0;
        let totalWashes = 0;
        let totalDries = 0;
        let totalOthers = 0;
        const unclassifiedList: string[] = [];

        if (filteredOrders.length > 0) {
            totalBaskets = filteredOrders.length;

            filteredOrders.forEach((o: any) => {
                const service = (o.service || o.produto || '').toLowerCase();
                const machine = (o.machine || '').toLowerCase();

                let isWash = false;
                let isDry = false;

                // 1. Explicit Machine Name Override (High Priority)
                if (machine.includes('secadora') || machine.includes('secar')) {
                    isDry = true;
                } else if (machine.includes('lavadora') || machine.includes('lavar')) {
                    isWash = true;
                }

                // 2. Explicit Service Description (Column L)
                if (!isWash && !isDry) {
                    if (service === 'lavagem' || service.includes('lavagem') || service.includes('lavar')) isWash = true;
                    else if (service === 'secagem' || service.includes('secagem') || service.includes('secar')) isDry = true;
                }

                // 3. Machine Number Parity Rule (Lavateria Standard: Odd=Dry, Even=Wash)
                if (!isWash && !isDry) {
                    const machineNumberMatch = machine.match(/\d+/);
                    if (machineNumberMatch) {
                        const num = parseInt(machineNumberMatch[0], 10);
                        if (!isNaN(num)) {
                            if (num % 2 === 0) isWash = true; // Even = Wash
                            else isDry = true; // Odd = Dry
                        }
                    }
                }

                // 4. Fallback Keywords (Legacy)
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
        }

        return { totalBaskets, totalWashes, totalDries, totalOthers, unclassifiedList };
    }, [filteredOrders]);

    const summary = useMemo(() => {
        return {
            totalSales: filteredRecords.length,
            totalValue: filteredRecords.reduce((acc: number, r: any) => acc + (r.valor || 0), 0),
            startDate: filteredRecords.length > 0 ? filteredRecords[0].data : null,
            endDate: filteredRecords.length > 0 ? filteredRecords[filteredRecords.length - 1].data : null,
            uniqueCustomers: new Set(filteredRecords.map((r: any) => r.cliente || 'Anonimo')).size
        };
    }, [filteredRecords]);

    // OPTIMIZATION: Use lightweight visit counter instead of heavy CRM metrics
    const visitCount = useMemo(() => {
        return calculateVisitCount(filteredRecords);
    }, [filteredRecords]);

    const ticketAverage = useMemo(() => {
        if (visitCount === 0) return 0;
        return summary.totalValue / visitCount;
    }, [summary.totalValue, visitCount]);

    // Global Metrics (Independent of Filter) - Optimized for large datasets
    const globalMetrics = useMemo(() => {
        if (!data?.records || data.records.length === 0) return { last30DaysAvg: 0, projection: 0 };

        let maxTs = 0;
        for (let i = 0; i < data.records.length; i++) {
            const ts = data.records[i].data instanceof Date ? data.records[i].data.getTime() : new Date(data.records[i].data).getTime();
            if (ts > maxTs) maxTs = ts;
        }

        const thirtyDaysAgoTs = maxTs - 30 * 24 * 60 * 60 * 1000;
        let last30Revenue = 0;

        for (let i = 0; i < data.records.length; i++) {
            const r = data.records[i];
            const ts = r.data instanceof Date ? r.data.getTime() : new Date(r.data).getTime();
            if (ts >= thirtyDaysAgoTs && ts <= maxTs) {
                last30Revenue += (r.valor || 0);
            }
        }

        const last30DaysAvg = last30Revenue / 30;

        const viewDate = summary.startDate ? new Date(summary.startDate) : new Date();
        const daysInViewMonth = getDaysInMonth(viewDate);

        const projection = last30DaysAvg * daysInViewMonth;

        return { last30DaysAvg, projection, daysInViewMonth };
    }, [data?.records, summary.startDate]);


    const dailyData = useMemo(() => {
        if (filteredRecords.length === 0) return [];

        const grouped: Record<string, number> = {};
        filteredRecords.forEach((r: any) => {
            const dateKey = format(new Date(r.data), 'dd/MM/yyyy');
            grouped[dateKey] = (grouped[dateKey] || 0) + r.valor;
        });

        return Object.entries(grouped)
            .map(([date, value]) => ({ date, valor: value }))
            .sort((a, b) => {
                const [d1, m1, y1] = a.date.split('/').map(Number);
                const [d2, m2, y2] = b.date.split('/').map(Number);
                return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
            });
    }, [filteredRecords]);

    // NEW: Store Data for Comparison View
    const storeData = useMemo(() => {
        if (filteredRecords.length === 0) return [];

        const grouped: Record<string, number> = {};
        filteredRecords.forEach((r: any) => {
            const storeName = r.loja || 'Desconhecida';
            grouped[storeName] = (grouped[storeName] || 0) + r.valor;
        });

        return Object.entries(grouped)
            .map(([name, value]) => ({ name, valor: value }))
            .sort((a, b) => b.valor - a.valor); // Sort by highest revenue
    }, [filteredRecords]);

    const uniqueStoreCount = useMemo(() => {
        return new Set(filteredRecords.map((r: any) => r.loja)).size;
    }, [filteredRecords]);

    const isMultiStoreView = uniqueStoreCount > 1;

    const paymentStats = useMemo(() => {
        const initial = {
            debit: 0,
            credit: 0,
            pix: 0,
            voucher: 0,
            voucherDetails: {} as Record<string, number>,
            coupons: 0,
            others: 0,
            otherTypes: [] as string[]
        };

        if (filteredRecords.length === 0) return initial;

        // Helper to remove accents for comparison
        const normalizeStr = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        return filteredRecords.reduce((acc: any, r: any) => {
            const type = normalizeStr(r.formaPagamento || 'não identificado');
            const cardType = normalizeStr(r.tipoCartao || '');
            const voucherCat = (r.categoriaVoucher || 'Geral').trim();
            const value = r.valor || 0;

            if (type.includes('qrcode') || type.includes('pix')) {
                acc.pix += value;
            } else if (type.includes('voucher') || type.includes('pre-pago') || type.includes('saldo')) {
                acc.voucher += value;
                acc.voucherDetails[voucherCat] = (acc.voucherDetails[voucherCat] || 0) + value;
            } else if (cardType.includes('credito') || type.includes('credito') || type.includes('app') || type.includes('online')) {
                acc.credit += value;
            } else if (cardType.includes('debito') || type.includes('debito') || type.includes('classico')) {
                acc.debit += value;
            } else {
                acc.others += value;
                const debugTag = `${r.formaPagamento} [N:${r.tipoCartao}]`;
                if (!acc.otherTypes.includes(debugTag)) acc.otherTypes.push(debugTag);
            }
            if (r.desconto > 0) acc.coupons++;
            return acc;
        }, initial);
    }, [filteredRecords]);

    if (!data) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Filter Bar */}
            <div className="bg-neutral-900/50 p-2 rounded-xl border border-neutral-800 flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2 px-3 text-neutral-400 border-r border-neutral-800 mr-2">
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Período</span>
                </div>
                {((role === 'attendant' ? ['today', 'yesterday'] : ['today', 'yesterday', 'thisMonth', 'lastMonth', 'allTime', 'custom']) as PeriodOption[]).map((opt) => (
                    <button key={opt} onClick={() => setPeriod(opt as PeriodOption)} className={`px-4 py-2 text-sm rounded-lg transition-colors ${period === opt ? 'bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-500/20' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'}`}>
                        {opt === 'today' && 'Hoje'}
                        {opt === 'yesterday' && 'Ontem'}
                        {opt === 'thisMonth' && 'Mês Atual'}
                        {opt === 'lastMonth' && 'Mês Anterior'}
                        {opt === 'allTime' && 'Todo o Período'}
                        {opt === 'custom' && 'Customizado'}
                    </button>
                ))}
                {period === 'custom' ? (
                    <div className="flex items-center gap-2 ml-auto animate-in fade-in slide-in-from-left-4 duration-300">
                        <input type="date" className="bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={customRange.start} onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))} />
                        <span className="text-neutral-600">até</span>
                        <input type="date" className="bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={customRange.end} onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))} />
                    </div>
                ) : (
                    <div className="ml-auto flex items-center gap-2 text-sm text-neutral-400 bg-neutral-950/50 px-3 py-1.5 rounded-lg border border-neutral-800 animate-in fade-in duration-300">
                        <Calendar className="w-4 h-4 text-neutral-500" />
                        <span className="font-mono text-neutral-300">
                            {summary.startDate ? format(new Date(summary.startDate), 'dd/MM/yyyy') : '-'}
                        </span>
                        <span className="text-neutral-600 text-xs">até</span>
                        <span className="font-mono text-neutral-300">
                            {summary.endDate ? format(new Date(summary.endDate), 'dd/MM/yyyy') : '-'}
                        </span>
                    </div>
                )}
            </div>

            {/* KPI Cards - Grid 7 items (4 cols) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

                {/* 1. Faturamento (Hero - Span 2) */}
                {/* 1. Faturamento (Hero - Highlighted Style) */}
                <div className="bg-neutral-900/50 p-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <DollarSign className="w-16 h-16 text-emerald-400" />
                    </div>
                    <div className="flex items-center gap-3 text-emerald-400 mb-2 relative z-10">
                        <div className="p-2 bg-emerald-500/20 rounded-lg"><DollarSign className="w-4 h-4" /></div>
                        <span className="text-sm font-bold">Faturamento</span>
                    </div>
                    <div className="text-3xl font-bold text-emerald-400 tracking-tight relative z-10">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.totalValue)}</div>
                </div>

                {/* 2. Transações */}
                {role !== 'attendant' && (
                    <>
                        <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 flex flex-col justify-between">
                            <div className="flex items-center gap-3 text-neutral-500 mb-2">
                                <div className="p-2 bg-neutral-800 rounded-lg"><TrendingUp className="w-4 h-4 text-neutral-400" /></div>
                                <span className="text-sm font-medium">Transações</span>
                            </div>
                            <div className="text-3xl font-bold text-neutral-100">{summary.totalSales}</div>
                        </div>

                        {/* 3. Ticket Médio */}
                        <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 flex flex-col justify-between">
                            <div className="flex items-center gap-3 text-neutral-500 mb-2">
                                <div className="p-2 bg-amber-500/10 rounded-lg"><CreditCard className="w-4 h-4 text-amber-400" /></div>
                                <span className="text-sm font-medium">Ticket Médio</span>
                            </div>
                            <div className="text-3xl font-bold text-amber-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ticketAverage)}</div>
                        </div>
                    </>
                )}

                {/* 4. Cestos */}
                <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 flex flex-col justify-between relative overflow-hidden group">
                    {/* Background Icon for styling */}
                    <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ShoppingBasket className="w-32 h-32 text-blue-400" />
                    </div>

                    <div className="flex items-center gap-3 text-neutral-500 mb-2 relative z-10">
                        <div className="p-2 bg-blue-500/10 rounded-lg"><ShoppingBasket className="w-4 h-4 text-blue-400" /></div>
                        <span className="text-sm font-medium">Cestos</span>
                    </div>
                    <div className="relative z-10">
                        <div className="text-3xl font-bold text-neutral-100 mb-2">{basketsMetrics.totalBaskets}</div>
                        <div className="flex gap-4 text-xs font-medium">
                            <div className="flex items-center gap-1.5 text-sky-400/80 bg-sky-400/10 px-2 py-1 rounded-md">
                                <Waves className="w-3 h-3" />
                                <span>{basketsMetrics.totalWashes}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-orange-400/80 bg-orange-400/10 px-2 py-1 rounded-md">
                                <Wind className="w-3 h-3" />
                                <span>{basketsMetrics.totalDries}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Clientes */}
                {role !== 'attendant' && (
                    <>
                        <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 flex flex-col justify-between">
                            <div className="flex items-center gap-3 text-neutral-500 mb-2">
                                <div className="p-2 bg-pink-500/10 rounded-lg"><Users className="w-4 h-4 text-pink-400" /></div>
                                <span className="text-sm font-medium">Clientes Atendidos</span>
                            </div>
                            <div className="text-3xl font-bold text-neutral-100">{summary.uniqueCustomers}</div>
                            <p className="text-xs text-neutral-500">
                                {summary.uniqueCustomers > 0 ? (basketsMetrics.totalBaskets / summary.uniqueCustomers).toFixed(1) : 0} cestos / cliente
                            </p>
                        </div>

                        {/* 6. Fat. Médio Dia */}
                        <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 flex flex-col justify-between">
                            <div className="flex items-center gap-3 text-neutral-500 mb-2">
                                <div className="p-2 bg-cyan-500/10 rounded-lg"><Activity className="w-4 h-4 text-cyan-400" /></div>
                                <span className="text-sm font-medium">Fat. Médio Dia</span>
                            </div>
                            <div className="text-xl font-bold text-cyan-400">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(globalMetrics.last30DaysAvg)}
                            </div>
                            <p className="text-[10px] text-neutral-600">Últimos 30 dias</p>
                        </div>

                        {/* 7. Projeção Mensal */}
                        <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 flex flex-col justify-between">
                            <div className="flex items-center gap-3 text-neutral-500 mb-2">
                                <div className="p-2 bg-emerald-500/10 rounded-lg"><BarChart3 className="w-4 h-4 text-emerald-400" /></div>
                                <span className="text-sm font-medium">Projeção</span>
                            </div>
                            <div className="text-xl font-bold text-emerald-400">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(globalMetrics.projection)}
                            </div>
                            <p className="text-[10px] text-neutral-600">Mês {globalMetrics.daysInViewMonth} dias</p>
                        </div>
                    </>
                )}
            </div>

            {role !== 'attendant' && (
                <>
                    {/* Main Chart Area - Full Width */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* Revenue Chart */}
                        <div className="w-full bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 h-[400px]">
                            <h3 className="font-semibold text-neutral-300 mb-6">{isMultiStoreView ? 'Vendas por Loja' : 'Receita Diária'}</h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart data={isMultiStoreView ? storeData : dailyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey={isMultiStoreView ? "name" : "date"} stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#10b981' }} formatter={(value: any) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)), 'Receita']} />
                                    <Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0] as [number, number, number, number]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Insights Column */}
                        <div className="flex flex-col gap-4">



                            {/* --- DEBUG: Unclassified Items --- */}
                            {basketsMetrics.unclassifiedList && basketsMetrics.unclassifiedList.length > 0 && (
                                <div className="bg-red-900/20 p-4 rounded-xl border border-red-800/50">
                                    <h4 className="text-xs font-bold text-red-400 uppercase mb-2">
                                        Itens Não Classificados ({basketsMetrics.totalOthers})
                                    </h4>
                                    <div className="text-xs text-red-300 font-mono space-y-1 max-h-[150px] overflow-y-auto">
                                        {basketsMetrics.unclassifiedList.map((item: string, i: number) => (
                                            <div key={i} className="border-b border-red-800/30 pb-0.5 last:border-0">
                                                {item}
                                            </div>
                                        ))}
                                        {basketsMetrics.totalOthers > 20 && (
                                            <div className="italic text-red-500">...e mais {basketsMetrics.totalOthers - 20} itens.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>


                    </div>

                    {/* Payment Method Summary Table */}
                    <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 overflow-hidden">
                        <div className="p-4 border-b border-neutral-800 bg-neutral-900/50 flex justify-between items-center">
                            <h3 className="font-semibold text-neutral-300">Resumo por Forma de Pagamento</h3>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-950/50 text-neutral-400 font-medium">
                                <tr>
                                    <th className="p-4">Método</th>
                                    <th className="p-4 text-right">Total Vendido</th>
                                    <th className="p-4 text-right">% do Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {/* PIX */}
                                <tr className="hover:bg-neutral-800/30 transition-colors">
                                    <td className="p-4 text-neutral-300">PIX</td>
                                    <td className="p-4 text-right font-mono text-neutral-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paymentStats.pix)}</td>
                                    <td className="p-4 text-right text-neutral-500">{summary.totalValue > 0 ? ((paymentStats.pix / summary.totalValue) * 100).toFixed(1) : 0}%</td>
                                </tr>
                                {/* Credit */}
                                <tr className="hover:bg-neutral-800/30 transition-colors">
                                    <td className="p-4 text-neutral-300">Crédito</td>
                                    <td className="p-4 text-right font-mono text-neutral-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paymentStats.credit)}</td>
                                    <td className="p-4 text-right text-neutral-500">{summary.totalValue > 0 ? ((paymentStats.credit / summary.totalValue) * 100).toFixed(1) : 0}%</td>
                                </tr>
                                {/* Debit */}
                                <tr className="hover:bg-neutral-800/30 transition-colors">
                                    <td className="p-4 text-neutral-300">Débito</td>
                                    <td className="p-4 text-right font-mono text-neutral-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paymentStats.debit)}</td>
                                    <td className="p-4 text-right text-neutral-500">{summary.totalValue > 0 ? ((paymentStats.debit / summary.totalValue) * 100).toFixed(1) : 0}%</td>
                                </tr>
                                {/* Voucher Summary */}
                                <tr className="hover:bg-neutral-800/30 transition-colors bg-neutral-800/10">
                                    <td className="p-4 text-neutral-200 font-medium">Voucher / Pré-pago (Total)</td>
                                    <td className="p-4 text-right font-mono text-neutral-200 font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paymentStats.voucher)}</td>
                                    <td className="p-4 text-right text-neutral-500">{summary.totalValue > 0 ? ((paymentStats.voucher / summary.totalValue) * 100).toFixed(1) : 0}%</td>
                                </tr>
                                {/* Voucher Details */}
                                {Object.entries(paymentStats.voucherDetails).map(([cat, val]) => (
                                    <tr key={cat} className="hover:bg-neutral-800/30 transition-colors">
                                        <td className="pl-8 pr-4 py-3 text-neutral-400 text-xs uppercase tracking-wider flex items-center gap-2">
                                            <div className="w-1 h-1 bg-neutral-600 rounded-full"></div>{cat}
                                        </td>
                                        <td className="p-4 py-3 text-right font-mono text-neutral-400 text-xs">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val))}</td>
                                        <td className="p-4 py-3 text-right text-neutral-600 text-xs">{summary.totalValue > 0 ? ((Number(val) / summary.totalValue) * 100).toFixed(1) : 0}%</td>
                                    </tr>
                                ))}
                                {/* Unmapped / Others */}
                                {paymentStats.others > 0 && (
                                    <tr className="bg-red-500/10 hover:bg-red-500/20 transition-colors border-t border-red-500/20">
                                        <td className="p-4 text-red-300">Outros / A Classificar <br /><span className="text-[10px] text-red-400 opacity-75">Tipos não mapeados: {paymentStats.otherTypes.join(', ')}</span></td>
                                        <td className="p-4 text-right font-mono text-red-300 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paymentStats.others)}</td>
                                        <td className="p-4 text-right text-red-500">{summary.totalValue > 0 ? ((paymentStats.others / summary.totalValue) * 100).toFixed(1) : 0}%</td>
                                    </tr>
                                )}
                                {/* Coupons */}
                                <tr className="bg-blue-500/5 hover:bg-blue-500/10 transition-colors border-t border-blue-500/20">
                                    <td className="p-4 text-blue-300 font-medium">Cupons de Desconto Utilizados</td>
                                    <td className="p-4 text-right font-mono text-blue-300 font-bold">{paymentStats.coupons}</td>
                                    <td className="p-4 text-right text-blue-500/50 text-xs">(Quantidade)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {/* Machine Monitor */}
                    <MachineMonitor allRecords={data.records} selectedStore={selectedStore} />
                </>
            )}
        </div>
    );
}
