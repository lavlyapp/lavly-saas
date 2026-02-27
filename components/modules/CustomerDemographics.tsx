import { CustomerProfile, calculateCrmMetrics } from "@/lib/processing/crm";
import { SaleRecord, CustomerRecord } from "@/lib/processing/etl";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { Users, User, Fingerprint, Lock, Sparkles, Activity, Clock, Calendar, Filter, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useState, useMemo } from "react";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, format } from "date-fns";

interface CustomerDemographicsProps {
    records: SaleRecord[];
    customers: CustomerRecord[];
    selectedStore?: string;
}

type PeriodOption = 'today' | 'yesterday' | 'thisMonth' | 'lastMonth' | 'custom' | 'allTime';

export function CustomerDemographics({ records, customers, selectedStore }: CustomerDemographicsProps) {
    const { canAccess } = useSubscription();

    // --- Filter State (Copied from FinancialDashboard) ---
    const [period, setPeriod] = useState<PeriodOption>(() => {
        if (!records || records.length === 0) return 'allTime';
        // Default to allTime so CRM metrics like LTV and Churn (which require a long term view) are correct
        return 'allTime';
    });

    const [customRange, setCustomRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });

    // --- Filter Logic ---
    const filteredRecords = useMemo(() => {
        if (!records) return [];

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
                if (customRange.start && customRange.end) {
                    interval = {
                        start: startOfDay(new Date(customRange.start)),
                        end: endOfDay(new Date(customRange.end))
                    };
                }
                break;
            case 'allTime':
                interval = null;
                break;
            default:
                interval = { start: startOfMonth(now), end: endOfMonth(now) };
        }

        if (!interval) return records;

        const startTs = interval.start.getTime();
        const endTs = interval.end.getTime();

        return records.filter((r) => {
            if (!r.data) return false;
            const ts = r.data instanceof Date ? r.data.getTime() : new Date(r.data).getTime();
            return ts >= startTs && ts <= endTs;
        });
    }, [records, period, customRange]);

    // --- Metrics Calculation ---
    const metrics = useMemo(() => calculateCrmMetrics(filteredRecords, customers), [filteredRecords, customers]);
    const profiles = metrics.profiles;


    // 1. Protection for Non-Gold Users
    if (!canAccess('whatsapp')) { // 'whatsapp' is the Gold flag for now, or we can check plan directly
        return (
            <div className="relative p-6 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden min-h-[400px] flex flex-col items-center justify-center text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 to-transparent pointer-events-none" />
                <div className="bg-neutral-800/50 p-4 rounded-full mb-4 ring-1 ring-amber-500/30">
                    <Fingerprint className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Quem é o meu Cliente?</h3>
                <p className="text-neutral-400 max-w-md mb-6">
                    Desbloqueie inteligência demográfica avançada. Saiba gênero, idade e hábitos de consumo detalhados do seu público.
                </p>
                <button
                    onClick={() => window.alert('Upgrade para Gold necessário!')}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white font-bold rounded-lg shadow-lg shadow-amber-900/20 transition-all transform hover:scale-105"
                >
                    <Sparkles className="w-4 h-4" />
                    Desbloquear Análise Demográfica (Gold)
                </button>
            </div>
        );
    }


    // --- Metrics Aggregation (Single Pass) ---
    const { genderData, ageData, ageStatsArray, maleStats, femaleStats, avgAge } = useMemo(() => {
        console.time("Demographics Calculation");
        const genderStats: Record<string, number> = { M: 0, F: 0, U: 0 };
        const ageStatsAgg: Record<string, any> = {};
        const maleGroup = { count: 0, totalSpent: 0, totalFreq: 0, totalTicket: 0, washCount: 0, dryCount: 0, churnHigh: 0, churnMedium: 0, churnLow: 0, days: {} as Record<string, number> };
        const femaleGroup = { count: 0, totalSpent: 0, totalFreq: 0, totalTicket: 0, washCount: 0, dryCount: 0, churnHigh: 0, churnMedium: 0, churnLow: 0, days: {} as Record<string, number> };
        let totalAgeSum = 0;
        let totalAgeCount = 0;

        for (let i = 0; i < profiles.length; i++) {
            const p = profiles[i];

            // 1. Gender Distribution
            const g = p.gender || 'U';
            genderStats[g] = (genderStats[g] || 0) + 1;

            // 2. Age Distribution
            let range = 'N/A';
            if (p.age) {
                totalAgeSum += p.age;
                totalAgeCount++;
                if (p.age >= 18 && p.age <= 24) range = '18-24';
                else if (p.age >= 25 && p.age <= 34) range = '25-34';
                else if (p.age >= 35 && p.age <= 44) range = '35-44';
                else if (p.age >= 45 && p.age <= 54) range = '45-54';
                else if (p.age >= 55) range = '55+';
            }
            if (!ageStatsAgg[range]) {
                ageStatsAgg[range] = { name: range, count: 0, spent: 0, visits: 0, baskets: 0, males: 0, females: 0, days: {} as Record<string, number> };
            }
            const a = ageStatsAgg[range];
            a.count++;
            a.spent += p.totalSpent;
            a.visits += p.totalVisits;
            a.baskets += (p.totalWashes || 0) + (p.totalDries || 0);
            if (p.gender === 'M') a.males++;
            if (p.gender === 'F') a.females++;
            a.days[p.topDay] = (a.days[p.topDay] || 0) + 1;

            // 3. Behavioral Comparison (Male vs Female)
            if (p.gender === 'M' || p.gender === 'F') {
                const target = p.gender === 'M' ? maleGroup : femaleGroup;
                target.count++;
                target.totalSpent += p.totalSpent;
                target.totalFreq += p.totalVisits;
                target.totalTicket += p.averageTicket;
                target.washCount += (p.totalWashes || 0);
                target.dryCount += (p.totalDries || 0);
                if (p.churnRisk === 'high') target.churnHigh++;
                else if (p.churnRisk === 'medium') target.churnMedium++;
                else target.churnLow++;
                target.days[p.topDay] = (target.days[p.topDay] || 0) + 1;
            }
        }

        const finalizeGroup = (g: any) => ({
            ...g,
            ticket: g.count > 0 ? g.totalTicket / g.count : 0,
            freq: g.count > 0 ? g.totalFreq / g.count : 0,
            topDay: Object.entries(g.days).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || '-'
        });

        const sortOrder = ['18-24', '25-34', '35-44', '45-54', '55+', 'N/A'];
        const ageStatsArray = sortOrder.map(key => ageStatsAgg[key]).filter(Boolean);
        const ageData = ageStatsArray
            .filter((d: any) => d.name !== 'N/A')
            .map((d: any) => ({ name: d.name, value: d.count }));

        const genderData = [
            { name: 'Masculino', value: genderStats['M'] || 0, color: '#3b82f6' },
            { name: 'Feminino', value: genderStats['F'] || 0, color: '#ec4899' },
            { name: 'Indefinido', value: genderStats['U'] || 0, color: '#525252' },
        ].filter(d => d.value > 0);

        console.timeEnd("Demographics Calculation");
        return {
            genderData,
            ageData,
            ageStatsArray,
            maleStats: finalizeGroup(maleGroup),
            femaleStats: finalizeGroup(femaleGroup),
            avgAge: totalAgeCount > 0 ? Math.round(totalAgeSum / totalAgeCount) : 0
        };
    }, [profiles]);

    // Comparative Data for Charts
    const ltvData = [
        { name: 'Homens', valor: Math.round(maleStats.totalSpent / (maleStats.count || 1)) },
        { name: 'Mulheres', valor: Math.round(femaleStats.totalSpent / (femaleStats.count || 1)) },
    ];

    const machineData = [
        { name: 'Homens', Lavar: maleStats.washCount, Secar: femaleStats.dryCount },
        { name: 'Mulheres', Lavar: femaleStats.washCount, Secar: femaleStats.dryCount },
    ];

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Filter Bar */}
            <div className="bg-neutral-900/50 p-2 rounded-xl border border-neutral-800 flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2 px-3 text-neutral-400 border-r border-neutral-800 mr-2">
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Período</span>
                </div>
                {(['today', 'yesterday', 'thisMonth', 'lastMonth', 'allTime', 'custom'] as PeriodOption[]).map((opt) => (
                    <button key={opt} onClick={() => setPeriod(opt)} className={`px-4 py-2 text-sm rounded-lg transition-colors ${period === opt ? 'bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-500/20' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'}`}>
                        {opt === 'today' && 'Hoje'}
                        {opt === 'yesterday' && 'Ontem'}
                        {opt === 'thisMonth' && 'Mês Atual'}
                        {opt === 'lastMonth' && 'Mês Anterior'}
                        {opt === 'allTime' && 'Todo o Período'}
                        {opt === 'custom' && 'Customizado'}
                    </button>
                ))}
                {period === 'custom' && (
                    <div className="flex items-center gap-2 ml-auto animate-in fade-in slide-in-from-left-4 duration-300">
                        <input type="date" className="bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={customRange.start} onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))} />
                        <span className="text-neutral-600">até</span>
                        <input type="date" className="bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={customRange.end} onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))} />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <Fingerprint className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Quem é o meu Cliente?</h2>
                    <p className="text-sm text-neutral-400">Análise demográfica e comportamental detalhada por Gênero e Idade.</p>
                </div>
            </div>

            {/* TOP ROW: DEMOGRAPHICS (Gender & Age) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Gender Distribution */}
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Distribuição por Gênero
                            <div className="group relative ml-1">
                                <Info className="w-3 h-3 text-neutral-600 hover:text-neutral-400 cursor-help" />
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-neutral-800 text-neutral-300 text-[10px] rounded border border-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                                    Identificado automaticamente pelo primeiro nome. Pode conter imprecisões.
                                </div>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] flex items-center justify-center relative">
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-white">{profiles.length}</span>
                                <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Clientes</span>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={genderData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={85}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {genderData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-6 mt-4">
                            {genderData.map((d: any) => (
                                <div key={d.name} className="flex flex-col items-center">
                                    <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                        {d.name}
                                    </div>
                                    <span className="text-sm font-bold text-white">
                                        {((d.value / profiles.length) * 100).toFixed(0)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Age Distribution */}
                <Card className="bg-neutral-900 border-neutral-800 lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Distribuição por Faixa Etária
                        </CardTitle>
                        {avgAge > 0 && <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">Idade Média: <b>{avgAge} anos</b></span>}
                    </CardHeader>
                    <CardContent>
                        {ageData.length > 0 ? (
                            <div className="h-[240px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={ageData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#737373' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: '#737373' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: '#262626' }}
                                            contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[240px] flex flex-col items-center justify-center text-neutral-500 gap-3 border border-dashed border-neutral-800 rounded-xl">
                                <Calendar className="w-10 h-10 opacity-20" />
                                <div className="text-center">
                                    <p className="text-sm font-medium text-neutral-300">Sem dados de nascimento</p>
                                    <p className="text-xs text-neutral-600 mt-1 max-w-xs">Importe a planilha de Pedidos (com coluna de Data de Nascimento) para visualizar.</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* NEW SECTION: DETAILED TABLES */}
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-8">
                <Filter className="w-5 h-5 text-indigo-500" />
                Detalhamento por Faixa Etária
            </h3>

            <Card className="bg-neutral-900 border-neutral-800 mt-6 overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white">Indicadores por Faixa</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm min-w-[800px]">
                        <thead>
                            <tr className="border-b border-neutral-800 bg-neutral-900">
                                <th className="px-5 py-3 text-left font-medium text-neutral-300">Faixa Etária</th>
                                <th className="px-4 py-3 text-right font-medium text-emerald-400/80">Total Gasto</th>
                                <th className="px-4 py-3 text-right font-medium text-emerald-400/80">Ticket Médio</th>
                                <th className="px-4 py-3 text-center font-medium text-blue-400/80" title="Sessões na loja. Compras feitas em um intervalo de até 3 horas contam como 1 única visita.">Visitas Tot.</th>
                                <th className="px-4 py-3 text-right font-medium text-blue-400/80" title="Média de Visitas por Cliente Único">Média/Cli.</th>
                                <th className="px-4 py-3 text-center font-medium text-orange-400/80" title="Soma de Lavagens e Secagens">Cestos Tot.</th>
                                <th className="px-4 py-3 text-right font-medium text-orange-400/80" title="Média de Cestos (Lavagens e Secagens) por Cliente Único">Média Cestos/Cli.</th>
                                <th className="px-4 py-3 text-center font-medium text-purple-400/80">Dia+ (Maior mov.)</th>
                                <th className="px-5 py-3 text-right font-medium text-neutral-300">Hom. / Mul.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {ageStatsArray.map((stat: any) => {
                                const topDay = Object.entries(stat.days as Record<string, number>).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
                                const malePct = Math.round((stat.males / (stat.count || 1)) * 100);
                                const femalePct = Math.round((stat.females / (stat.count || 1)) * 100);
                                return (
                                    <tr key={stat.name} className="hover:bg-neutral-800/30 transition-colors">
                                        <td className="px-5 py-4 font-bold text-white whitespace-nowrap">{stat.name}</td>
                                        <td className="px-4 py-4 text-right text-emerald-400 font-mono">
                                            {stat.spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-4 py-4 text-right text-neutral-300 font-mono">
                                            {(stat.spent / (stat.count || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="px-4 py-4 text-center text-blue-400 font-bold bg-blue-500/5">
                                            {stat.visits}
                                        </td>
                                        <td className="px-4 py-4 text-right text-neutral-300 bg-blue-500/5">
                                            {(stat.visits / (stat.count || 1)).toFixed(1)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-orange-400 font-bold bg-orange-500/5">
                                            {stat.baskets}
                                        </td>
                                        <td className="px-4 py-4 text-right text-neutral-300 bg-orange-500/5">
                                            {(stat.baskets / (stat.count || 1)).toFixed(1)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-white text-xs uppercase font-medium bg-purple-500/5">
                                            {topDay.slice(0, 3)}
                                        </td>
                                        <td className="px-5 py-4 text-right text-xs bg-purple-500/5 whitespace-nowrap">
                                            <span className="text-blue-400 font-medium">{malePct}%</span>
                                            <span className="text-neutral-600 mx-1.5">|</span>
                                            <span className="text-pink-400 font-medium">{femalePct}%</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* MIDDLE ROW: BEHAVIORAL COMPARISON CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Male Profile */}
                <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                    <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/20">
                            <User className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white">Perfil Masculino</h4>
                            <p className="text-xs text-neutral-400">{maleStats.count} clientes identificados</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-neutral-950/50 p-3 rounded-lg border border-neutral-800">
                            <span className="text-xs text-neutral-500 block mb-1">Ticket Médio</span>
                            <span className="text-lg font-mono text-white">R$ {maleStats.ticket.toFixed(2)}</span>
                        </div>
                        <div className="bg-neutral-950/50 p-3 rounded-lg border border-neutral-800">
                            <span className="text-xs text-neutral-500 block mb-1">Dia Preferido</span>
                            <span className="text-lg text-white">{maleStats.topDay}</span>
                        </div>
                        <div className="bg-neutral-950/50 p-3 rounded-lg border border-neutral-800">
                            <span className="text-xs text-neutral-500 block mb-1" title="Clientes com risco médio ou alto">Clientes em Risco</span>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden flex">
                                    <div className="h-full bg-rose-500" style={{ width: `${(maleStats.churnHigh / (maleStats.count || 1)) * 100}%` }} title="Risco Alto" />
                                    <div className="h-full bg-amber-500" style={{ width: `${(maleStats.churnMedium / (maleStats.count || 1)) * 100}%` }} title="Risco Médio" />
                                </div>
                                <span className="text-xs font-bold text-rose-500">
                                    {(((maleStats.churnHigh + maleStats.churnMedium) / (maleStats.count || 1)) * 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>
                        <div className="bg-neutral-950/50 p-3 rounded-lg border border-neutral-800">
                            <span className="text-xs text-neutral-500 block mb-1">Preferência</span>
                            <span className="text-sm text-blue-300">
                                {maleStats.washCount > maleStats.dryCount ? 'Lavar Mais' : 'Secar Mais'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Female Profile */}
                <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl relative overflow-hidden group hover:border-pink-500/30 transition-colors">
                    <div className="absolute top-0 right-0 p-32 bg-pink-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="p-3 bg-pink-500/20 rounded-xl border border-pink-500/20">
                            <User className="w-6 h-6 text-pink-400" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white">Perfil Feminino</h4>
                            <p className="text-xs text-neutral-400">{femaleStats.count} clientes identificados</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-neutral-950/50 p-3 rounded-lg border border-neutral-800">
                            <span className="text-xs text-neutral-500 block mb-1">Ticket Médio</span>
                            <span className="text-lg font-mono text-white">R$ {femaleStats.ticket.toFixed(2)}</span>
                        </div>
                        <div className="bg-neutral-950/50 p-3 rounded-lg border border-neutral-800">
                            <span className="text-xs text-neutral-500 block mb-1">Dia Preferido</span>
                            <span className="text-lg text-white">{femaleStats.topDay}</span>
                        </div>
                        <div className="bg-neutral-950/50 p-3 rounded-lg border border-neutral-800">
                            <span className="text-xs text-neutral-500 block mb-1" title="Clientes com risco médio ou alto">Clientes em Risco</span>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden flex">
                                    <div className="h-full bg-rose-500" style={{ width: `${(femaleStats.churnHigh / (femaleStats.count || 1)) * 100}%` }} title="Risco Alto" />
                                    <div className="h-full bg-amber-500" style={{ width: `${(femaleStats.churnMedium / (femaleStats.count || 1)) * 100}%` }} title="Risco Médio" />
                                </div>
                                <span className="text-xs font-bold text-rose-500">
                                    {(((femaleStats.churnHigh + femaleStats.churnMedium) / (femaleStats.count || 1)) * 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>
                        <div className="bg-neutral-950/50 p-3 rounded-lg border border-neutral-800">
                            <span className="text-xs text-neutral-500 block mb-1">Preferência</span>
                            <span className="text-sm text-pink-300">
                                {femaleStats.washCount > femaleStats.dryCount ? 'Lavar Mais' : 'Secar Mais'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BOTTOM ROW: ADVANCED CHARTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* LTV Comparison */}
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> LTV (Lifetime Value) Médio
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={ltvData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#a3a3a3', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#f5f5f5' }}
                                        itemStyle={{ color: '#f5f5f5' }}
                                        formatter={(value: any) => [`R$ ${value}`, 'LTV Médio']}
                                    />
                                    <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={32}>
                                        {ltvData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.name === 'Homens' ? '#3b82f6' : '#ec4899'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Machine Preference */}
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Preferência de Máquinas (Total de Ciclos)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={machineData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#737373' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12, fill: '#737373' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#f5f5f5' }}
                                        itemStyle={{ color: '#f5f5f5' }}
                                    />
                                    <Bar dataKey="Lavar" fill="#0ea5e9" stackId="a" />
                                    <Bar dataKey="Secar" fill="#f97316" stackId="a" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-2 text-xs text-neutral-500">
                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-sky-500 rounded-full"></div> Lavagem</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-orange-500 rounded-full"></div> Secagem</div>
                        </div>
                    </CardContent>
                </Card>

            </div>

        </div>
    );
}
