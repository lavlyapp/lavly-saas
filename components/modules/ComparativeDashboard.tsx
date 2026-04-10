'use client';

import { useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, ComposedChart
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isSameMonth, getDay, getISOWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateCrmMetrics } from '@/lib/processing/crm';
import { CustomerRecord, SaleRecord } from '@/lib/processing/etl';

import { getCanonicalStoreName } from '@/lib/vmpay-config';

interface ComparativeDashboardProps {
    data?: any; // Mantido para compatibilidade, mas ignorado
    customers?: CustomerRecord[];
    selectedStore?: string;
}

// Helper to format Date based on standard input
const safeFormatWeek = (date: Date) => {
    // Custom getWeekOfMonth since it's not exported in this date-fns version apparently
    const startWeek = getISOWeek(startOfMonth(date));
    const currentWeek = getISOWeek(date);
    let weekOfMonth = currentWeek - startWeek + 1;
    if (weekOfMonth < 1) weekOfMonth = 1; // Fallback for year crossover

    // @ts-ignore
    return `S${weekOfMonth} / ${format(date, 'MMM', { locale: ptBR })}`;
};

export function ComparativeDashboard({ data, customers, selectedStore = 'Todas' }: ComparativeDashboardProps) {

    const canonicalSelected = getCanonicalStoreName(selectedStore);

    const canonicalSelected = getCanonicalStoreName(selectedStore || 'Todas');

    const [isLoading, setIsLoading] = useState(true);
    const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
    const [heatmapData, setHeatmapData] = useState<{ daysChart: any[], weeksChart: any[] }>({ daysChart: [], weeksChart: [] });
    const [fetchError, setFetchError] = useState<string | null>(null);

    React.useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/metrics/comparative?store=${encodeURIComponent(selectedStore || 'Todas')}`);
                const json = await res.json();
                if (isMounted && json.success) {
                    setMonthlyStats(json.payload.monthlyStats);
                    setHeatmapData(json.payload.heatmapData);
                } else if (isMounted) {
                    setFetchError(json.error || 'Erro Vercel');
                }
            } catch (err: any) {
                if (isMounted) setFetchError(err.message);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, [selectedStore]);

    if (isLoading) {
        return (
             <div className="space-y-6 animate-in fade-in">
                <div className="h-10 w-96 bg-neutral-900 animate-pulse rounded-md mb-2"></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-[400px] bg-neutral-900/40 rounded-xl animate-pulse"></div>
                    <div className="h-[400px] bg-neutral-900/40 rounded-xl animate-pulse"></div>
                    <div className="h-[350px] bg-neutral-900/40 rounded-xl animate-pulse"></div>
                    <div className="h-[350px] bg-neutral-900/40 rounded-xl animate-pulse"></div>
                </div>
             </div>
        );
    }





    if (!monthlyStats || monthlyStats.length === 0) {
        return (
            <div className="flex h-[400px] items-center justify-center bg-neutral-900/50 rounded-xl border border-neutral-800">
                <p className="text-neutral-500">Nenhum dado disponível para Análise Comparativa.</p>
            </div>
        );
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Financeiro Comparativo (12 Meses)</h2>
                <p className="text-neutral-400">
                    Evolução de faturamento, métricas de serviço e perfil de público ao longo do último ano.
                </p>
            </div>

            {/* Grid 1: Main Revenue & Ticket (Side by side) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Revenue Line/Bar */}
                <div className="bg-neutral-900/50 p-4 sm:p-6 rounded-xl border border-neutral-800 h-[300px] sm:h-[400px] flex flex-col">
                    <h3 className="font-semibold text-neutral-300 mb-6">Faturamento Mensal</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                                    formatter={(value: any) => [formatCurrency(Number(value)), 'Faturamento']}
                                />
                                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Customers & Ticket (Composed Line/Bar) */}
                <div className="bg-neutral-900/50 p-4 sm:p-6 rounded-xl border border-neutral-800 h-[300px] sm:h-[400px] flex flex-col">
                    <h3 className="font-semibold text-neutral-300 mb-6">Clientes Únicos vs Ticket Médio</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />

                                {/* Left Y-Axis for Ticket */}
                                <YAxis yAxisId="left" stroke="#8b5cf6" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                                {/* Right Y-Axis for Customers */}
                                <YAxis yAxisId="right" orientation="right" stroke="#eab308" fontSize={12} tickLine={false} axisLine={false} />

                                <Tooltip
                                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                                    formatter={(value: any, name: any) => {
                                        if (name === 'Ticket Médio') return [formatCurrency(Number(value)), name];
                                        return [value, name];
                                    }}
                                />
                                <Legend />
                                <Bar yAxisId="right" dataKey="uniqueCustomers" name="Clientes Únicos" fill="#eab308" radius={[4, 4, 0, 0]} opacity={0.6} barSize={20} />
                                <Line yAxisId="left" type="monotone" dataKey="ticket" name="Ticket Médio" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Grid 2: Services & Demographics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Washes vs Dries */}
                <div className="bg-neutral-900/50 p-4 sm:p-6 rounded-xl border border-neutral-800 h-[300px] sm:h-[350px] flex flex-col">
                    <h3 className="font-semibold text-neutral-300 mb-6 text-sm sm:text-base">Volume de Serviços (Lavagem vs Secagem)</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorWash" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorDry" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }} />
                                <Legend />
                                <Area type="monotone" dataKey="washes" name="Lavagens" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorWash)" />
                                <Area type="monotone" dataKey="dries" name="Secagens" stroke="#f97316" fillOpacity={1} fill="url(#colorDry)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gender Demographics over Time */}
                <div className="bg-neutral-900/50 p-4 sm:p-6 rounded-xl border border-neutral-800 h-[300px] sm:h-[350px] flex flex-col">
                    <h3 className="font-semibold text-neutral-300 mb-6 text-sm sm:text-base">Evolução do Público (% Homens vs Mulheres)</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyStats} stackOffset="expand" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val * 100}%`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                                    formatter={(value: any, name: any) => [`${value}%`, name]}
                                />
                                <Legend />
                                <Bar dataKey="malePct" name="Homens (%)" stackId="a" fill="#3b82f6" />
                                <Bar dataKey="femalePct" name="Mulheres (%)" stackId="a" fill="#ec4899" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Grid 3: Best Days and Weeks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Best Days */}
                <div className="bg-neutral-900/50 p-4 sm:p-6 rounded-xl border border-neutral-800 h-[300px] sm:h-[350px] flex flex-col">
                    <h3 className="font-semibold text-neutral-300 mb-1">Média de Faturamento por Dia da Semana</h3>
                    <p className="text-xs text-neutral-500 mb-6">Considera todo o período filtrado.</p>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={heatmapData.daysChart} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                <XAxis type="number" stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val / 1000}k`} />
                                <YAxis dataKey="name" type="category" stroke="#666" fontSize={12} tickLine={false} axisLine={false} width={80} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                                    formatter={(value: any) => [formatCurrency(Number(value)), 'Média/Mês']}
                                />
                                <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Best Weeks */}
                <div className="bg-neutral-900/50 p-4 sm:p-6 rounded-xl border border-neutral-800 h-[300px] sm:h-[350px] flex flex-col">
                    <h3 className="font-semibold text-neutral-300 mb-1">Faturamento por Semana do Mês</h3>
                    <p className="text-xs text-neutral-500 mb-6">Média de desempenho por semana.</p>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={heatmapData.weeksChart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                                    formatter={(value: any) => [formatCurrency(Number(value)), 'Média/Mês']}
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#f43f5e" strokeWidth={4} dot={{ r: 6, fill: '#f43f5e' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
}

