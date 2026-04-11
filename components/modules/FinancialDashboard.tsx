'use client';

import { useMemo, useState, useEffect } from 'react';
import { ArrowUpRight, DollarSign, Calendar, TrendingUp, CreditCard, Filter, Users, Activity, BarChart3, ShoppingBasket, Waves, Wind, RefreshCw } from "lucide-react";
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
    allRecords?: any[];
    allOrders?: any[];
    selectedStore?: string;
}

type PeriodOption = 'today' | 'yesterday' | 'thisMonth' | 'lastMonth' | 'custom' | 'allTime';

export function FinancialDashboard({ data, allRecords, allOrders, selectedStore = 'Todas' }: FinancialDashboardProps) {
    const { role } = useAuth();
    
    const [renderTime, setRenderTime] = useState<string>("");
    useEffect(() => {
        setRenderTime(format(new Date(), "dd/MM/yyyy HH:mm"));
    }, [data, allRecords, allOrders]);

    // DEBUG: Inject precise length check
    console.log(`[DEBUG-FinancialDashboard] Mounted. Stores: ${selectedStore}`);
    console.log(`[DEBUG-FinancialDashboard] data.records: ${data?.records?.length} | data.orders: ${data?.orders?.length}`);
    console.log(`[DEBUG-FinancialDashboard] allRecords: ${allRecords?.length} | allOrders: ${allOrders?.length}`);

    // --- State for Filters ---
    // --- Smart Date Initialization (Lazy State) ---
    const [period, setPeriod] = useState<PeriodOption>(() => {
        if (role === 'atendente') return 'today';
        if (!data?.records || data.records.length === 0) return 'thisMonth';

        // DEBUG: Check first record
        const first = data.records[0];
        console.log(`[FinancialDashboard] First record store: "${first.loja}" | Selected: "${selectedStore}" | Records: ${data.records.length}`);

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
        const nowTimeStamp = new Date().getTime();
        const brtNow = new Date(nowTimeStamp - (3 * 3600 * 1000));
        const defaultRange = {
            start: format(startOfMonth(brtNow), 'yyyy-MM-dd'),
            end: format(endOfMonth(brtNow), 'yyyy-MM-dd')
        };

        if (!data?.records || data.records.length === 0) return defaultRange;

        // Default custom range to min/max of dataset if exists
        const timestamps = data.records.map((r: any) => new Date(r.data).getTime());
        if (timestamps.length > 0) {
            let minTs = timestamps[0];
            let maxTs = timestamps[0];
            for (let i = 1; i < timestamps.length; i++) {
                if (timestamps[i] < minTs) minTs = timestamps[i];
                if (timestamps[i] > maxTs) maxTs = timestamps[i];
            }
            
            const minBrt = new Date(minTs - (3 * 3600 * 1000));
            const maxBrt = new Date(maxTs - (3 * 3600 * 1000));
            return {
                start: minBrt.toISOString().substring(0, 10),
                end: maxBrt.toISOString().substring(0, 10)
            };
        }

        return defaultRange;
    });

    useEffect(() => {
        const handleUpdate = () => setRenderKey(prev => prev + 1);
        window.addEventListener('lavly-force-financial-update', handleUpdate);
        return () => window.removeEventListener('lavly-force-financial-update', handleUpdate);
    }, []);

    const [renderKey, setRenderKey] = useState<number>(0);
    const [metrics, setMetrics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchMetrics = async () => {
            const ts = new Date().toISOString().substring(11, 23); // HH:mm:ss.SSS
            console.log(`[${ts}] [FinancialDashboard] Iniciando fetchMetrics na borda AWS para período: ${period}...`);
            const startTime = performance.now();
            
            setFetchError(null);
            setIsLoading(true);
            try {
                // Determine start/end if custom
                let params = `?store=${encodeURIComponent(selectedStore)}&period=${period}`;
                if (period === 'custom') {
                    params += `&start=${customRange.start}&end=${customRange.end}`;
                }
                params += `&t=${Date.now()}`;

                console.log(`[${new Date().toISOString().substring(11, 23)}] [FinancialDashboard] Enviando requisição HTTP: /api/metrics/financial${params}`);
                const res = await fetch(`/api/metrics/financial${params}`);
                
                const jsonStart = performance.now();
                console.log(`[${new Date().toISOString().substring(11, 23)}] [FinancialDashboard] Resposta HTTP ${res.status} recebida em ${((jsonStart - startTime) / 1000).toFixed(2)}s. Extraindo JSON...`);
                const json = await res.json();
                
                const endTime = performance.now();
                console.log(`[${new Date().toISOString().substring(11, 23)}] [FinancialDashboard] JSON decodificado. Tempo Total: ${((endTime - startTime) / 1000).toFixed(2)}s.`);
                
                if (isMounted) {
                    if (json.success) {
                        setMetrics(json.payload);
                        console.log(`[${new Date().toISOString().substring(11, 23)}] [FinancialDashboard] O Gráfico foi renderizado e os dados foram aplicados na tela com sucesso.`);
                    } else {
                        setFetchError(`Vercel API falhou: ${json.error}`);
                    }
                }
            } catch (err: any) {
                if (isMounted) setFetchError(`Falha TRÁGICA no Fetch: ${err.message}`);
                const errTime = new Date().toISOString().substring(11, 23);
                console.error(`[${errTime}] [FinancialDashboard] Falha TRÁGICA no Fetch após ${((performance.now() - startTime) / 1000).toFixed(2)}s.`, err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        if (period === 'custom' && !customRange?.start && !customRange?.end) {
            setIsLoading(false);
            return;
        }

        fetchMetrics();
        return () => { isMounted = false; };
    }, [period, customRange, selectedStore, renderKey]);

    const ticketAverage = useMemo(() => {
        if (!metrics) return 0;
        return metrics.summary.ticketMedio || 0;
    }, [metrics]);

    if (!data) return null;

    if (fetchError) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500 min-h-[500px] flex flex-col items-center justify-center border border-red-500/20 bg-red-500/5 rounded-xl p-8">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                    <span className="text-red-500 font-bold text-2xl">X</span>
                </div>
                <h3 className="text-xl font-bold font-mono text-red-400">Erro Fatal na Borda AWS</h3>
                <p className="text-neutral-400 text-center max-w-lg mb-4">{fetchError}</p>
                <div className="group">
                    <p className="text-neutral-500 text-sm">Parece que a API Serverless bloqueou a operação. Verifique o problema ou contate o suporte.</p>
                </div>
            </div>
        );
    }

    if (isLoading || !metrics) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500 min-h-[500px] flex flex-col items-center justify-center">
                <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <p className="text-neutral-400 font-medium">Buscando métricas na borda da AWS...</p>
                <p className="text-neutral-600 text-sm">Calculando centenas de milhares de linhas instantaneamente.</p>
            </div>
        );
    }

    const { summary, basketsMetrics, dailyData, storeData, uniqueStoreCount, paymentStats, globalMetrics } = metrics;
    const isMultiStoreView = uniqueStoreCount > 1;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Filter Bar */}
            <div className="bg-neutral-900/50 p-2 rounded-xl border border-neutral-800 flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2 px-3 text-neutral-400 border-r border-neutral-800 mr-2">
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Período</span>
                </div>
                {((role === 'atendente' ? ['today', 'yesterday'] : ['today', 'yesterday', 'thisMonth', 'lastMonth', 'allTime', 'custom']) as PeriodOption[]).map((opt) => (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

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
                {role !== 'atendente' && (
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
                {role !== 'atendente' && (
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

            {role !== 'atendente' && (
                <>
                    {/* Main Chart Area - Full Width */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* Revenue Chart */}
                        <div className="w-full bg-neutral-900/50 p-4 sm:p-6 rounded-xl border border-neutral-800 h-[300px] sm:h-[400px]">
                            <h3 className="font-semibold text-neutral-300 mb-6">{isMultiStoreView ? 'Vendas por Loja' : 'Receita Diária'}</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={isMultiStoreView ? storeData : dailyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey={isMultiStoreView ? "name" : "date"} stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#10b981' }} formatter={(value: any) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)), 'Receita']} />
                                    <Bar dataKey={isMultiStoreView ? "totalRevenue" : "value"} fill="#10b981" radius={[4, 4, 0, 0] as [number, number, number, number]} />
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
                        <div className="overflow-x-auto w-full">
                        <table className="w-full min-w-[500px] text-left text-sm">
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
                    </div>
                    <div className="pt-8">
                        <MachineMonitor allRecords={allRecords || data.records} allOrders={allOrders || data.orders || []} selectedStore={selectedStore} />
                    </div>
                </>
            )}
        </div>
    );
}
