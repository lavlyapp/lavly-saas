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
    data: {
        records: SaleRecord[];
        orders?: any[];
        summary: any;
        errors?: any[];
        logs?: any[];
    };
    customers: CustomerRecord[];
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

    // --- Store Filter Logic ---
    const filteredRecords = useMemo(() => {
        if (!data?.records) return [];
        if (!selectedStore || selectedStore === 'Todas' || canonicalSelected === 'Todas') return data.records;
        return data.records.filter((r: any) => getCanonicalStoreName(r.loja) === canonicalSelected);
    }, [data?.records, selectedStore, canonicalSelected]);

    const filteredOrders = useMemo(() => {
        if (!data?.orders) return [];
        if (!selectedStore || selectedStore === 'Todas' || canonicalSelected === 'Todas') return data.orders;
        return data.orders.filter((o: any) => getCanonicalStoreName(o.loja) === canonicalSelected);
    }, [data?.orders, selectedStore, canonicalSelected]);


    // --- 12-Month Array Generator ---
    const last12Months = useMemo(() => {
        const now = new Date();
        const months = [];
        for (let i = 11; i >= 0; i--) {
            const d = subMonths(now, i);
            months.push({
                start: startOfMonth(d),
                end: endOfMonth(d),
                // @ts-ignore
                label: format(d, 'MMM yy', { locale: ptBR }),
                yearMonth: format(d, 'yyyy-MM')
            });
        }
        return months;
    }, []);


    // --- Core Aggregations ---
    const monthlyStats = useMemo(() => {
        // PERFORMANCE FIX: Pre-process global data ONCE instead of 12 times
        // 1. Pre-group visits (180 mins) across all filteredRecords to avoid slow CRM calculation in each month
        const customerVisitsList: { date: Date, totalValue: number }[] = [];
        const customerRecordsMap = new Map<string, SaleRecord[]>();

        filteredRecords.forEach(r => {
            const client = r.cliente && r.cliente !== 'Consumidor Final' ? r.cliente : 'ANON_' + Math.random();
            if (!customerRecordsMap.has(client)) customerRecordsMap.set(client, []);
            customerRecordsMap.get(client)!.push(r);
        });

        customerRecordsMap.forEach((sales) => {
            sales.sort((a, b) => a.data.getTime() - b.data.getTime());
            const visits: { date: Date, totalValue: number }[] = [];
            sales.forEach(r => {
                const lastVisit = visits.length > 0 ? visits[visits.length - 1] : null;
                // 180 mins = 10800000 ms
                if (lastVisit && (r.data.getTime() - lastVisit.date.getTime()) <= 10800000 && (r.data.getTime() - lastVisit.date.getTime()) >= 0) {
                    lastVisit.totalValue += r.valor;
                } else {
                    visits.push({ date: r.data, totalValue: r.valor });
                }
            });
            customerVisitsList.push(...visits);
        });

        // 2. Pre-build Gender Map for FAST loop lookups
        const maleIdentifiers = [' SR ', ' SENHOR '];
        const femaleIdentifiers = [' SRA ', ' SENHORA ', ' DRA '];
        const genderCache = new Map<string, string>(); // 'M' | 'F'

        customers.forEach(c => {
            if (c.name && c.gender) {
                const g = c.gender.toLowerCase();
                const n = c.name.trim().toUpperCase().split(' ')[0];
                if (g === 'm' || g === 'masculino') genderCache.set(n, 'M');
                if (g === 'f' || g === 'feminino') genderCache.set(n, 'F');
            }
        });

        return last12Months.map(month => {

            // 1. Sales & Revenue
            const monthSales = filteredRecords.filter(r => {
                if (!r.data) return false;
                const d = new Date(r.data);
                return d >= month.start && d <= month.end;
            });

            const totalRevenue = monthSales.reduce((sum, r) => sum + (r.valor || 0), 0);
            const uniqueCustomers = new Set(monthSales.map(r => r.cliente || 'Anonimo')).size;

            // 1.5. CRM Metrics Equivalent (Fast Calculation based on pre-processed visits)
            const monthVisits = customerVisitsList.filter(v => v.date >= month.start && v.date <= month.end);
            const ticketAverage = monthVisits.length > 0 ? totalRevenue / monthVisits.length : 0;

            // 2. Orders & Services (Baskets, Washes, Dries)
            const monthOrders = filteredOrders.filter(o => {
                if (!o.data) return false;
                const d = new Date(o.data);
                return d >= month.start && d <= month.end;
            });

            let washes = 0;
            let dries = 0;

            monthOrders.forEach(o => {
                const service = (o.service || o.produto || '').toLowerCase();
                const machine = (o.machine || '').toLowerCase();
                let isWash = false;
                let isDry = false;

                // Exact same methodology as FinancialDashboard basketsMetrics
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

                if (isWash) washes++;
                if (isDry) dries++;
            });

            // 3. Gender Demographics Breakdown
            let maleCount = 0;
            let femaleCount = 0;

            // For gender, we count unique customers in that month, not raw sales.
            const monthCustomerMap = new Map();
            monthSales.forEach(r => {
                if (r.cliente && r.cliente !== 'Consumidor Final') {
                    if (!monthCustomerMap.has(r.cliente)) {
                        monthCustomerMap.set(r.cliente, true);
                    }
                }
            });

            monthCustomerMap.forEach((_, clientName) => {
                const normalizedName = clientName.toUpperCase();
                let isMale = false;
                let isFemale = false;

                if (maleIdentifiers.some(id => normalizedName.includes(id))) isMale = true;
                if (femaleIdentifiers.some(id => normalizedName.includes(id))) isFemale = true;

                // Fast Pre-Built Fallback to Customer Registry
                if (!isMale && !isFemale) {
                    const firstName = normalizedName.split(' ')[0];
                    const g = genderCache.get(firstName);
                    if (g === 'M') isMale = true;
                    if (g === 'F') isFemale = true;
                }

                if (isMale) maleCount++;
                else if (isFemale) femaleCount++;
            });

            const totalGenderClassified = maleCount + femaleCount;
            const malePct = totalGenderClassified > 0 ? (maleCount / totalGenderClassified) * 100 : 0;
            const femalePct = totalGenderClassified > 0 ? (femaleCount / totalGenderClassified) * 100 : 0;

            return {
                name: month.label,
                revenue: totalRevenue,
                transactions: monthSales.length,
                uniqueCustomers: uniqueCustomers,
                ticket: ticketAverage, // Replicating the robust Visit logic ticket
                baskets: monthOrders.length,
                washes: washes,
                dries: dries,
                malePct: parseFloat(malePct.toFixed(1)),
                femalePct: parseFloat(femalePct.toFixed(1))
            };

        });
    }, [last12Months, filteredRecords, filteredOrders, customers]);



    // --- Best Days & Weeks Heatmap Data ---
    const heatmapData = useMemo(() => {
        // We look at the entire selected filteredRecords for this aggregate.
        // Array of 7 days (0=Sunday to 6=Saturday)
        const dayOfWeekTotals = [0, 0, 0, 0, 0, 0, 0];
        const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];

        // Week of Month: 1 The first week, 2, 3, 4, 5...
        // We'll map week 1 to 5.
        const weekOfMonthTotals = [0, 0, 0, 0, 0, 0]; // Index 1-5 (ignore 0)

        // Count how many months are in the dataset to calculate pure averages if needed
        const uniqueMonths = new Set<string>();

        filteredRecords.forEach(r => {
            if (!r.data) return;
            const date = new Date(r.data);
            const val = r.valor || 0;

            const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday...
            // @ts-ignore
            const dayName = format(date, 'EEEE', { locale: ptBR }); // Not used in this snippet, but kept as per instruction
            const weekStr = safeFormatWeek(date); // Not used for indexing, but kept as per instruction

            dayOfWeekTotals[dayOfWeek] += val;
            dayOfWeekCounts[dayOfWeek]++;

            // Manual calculation for week of month (numeric)
            const startWeek = getISOWeek(startOfMonth(date));
            const currentWeek = getISOWeek(date);
            let week = currentWeek - startWeek + 1;
            if (week < 1) week = 1; // Fallback for year crossover

            if (week >= 1 && week <= 5) {
                weekOfMonthTotals[week] += val;
            }

            uniqueMonths.add(format(date, 'yyyy-MM'));
        });

        const numMonths = uniqueMonths.size || 1;
        const daysLabel = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

        const daysChart = daysLabel.map((label, index) => ({
            name: label,
            revenue: dayOfWeekTotals[index] / numMonths, // Average per month for that day
            total: dayOfWeekTotals[index]
        }));

        const weeksChart = [1, 2, 3, 4, 5].map(w => ({
            name: `Semana ${w}`,
            revenue: weekOfMonthTotals[w] / numMonths,
            total: weekOfMonthTotals[w]
        }));

        return {
            daysChart,
            weeksChart
        };

    }, [filteredRecords]);


    if (!data?.records || data.records.length === 0) {
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
                <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 h-[400px] flex flex-col">
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
                <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 h-[400px] flex flex-col">
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
                <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 h-[350px] flex flex-col">
                    <h3 className="font-semibold text-neutral-300 mb-6">Volume de Serviços (Lavagem vs Secagem)</h3>
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
                <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 h-[350px] flex flex-col">
                    <h3 className="font-semibold text-neutral-300 mb-6">Evolução do Público (% Homens vs Mulheres)</h3>
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
                <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 h-[350px] flex flex-col">
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
                <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 h-[350px] flex flex-col">
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

