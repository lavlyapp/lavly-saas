"use client";

import { useState, useMemo, useEffect } from "react";
import { SaleRecord, CustomerRecord } from "@/lib/processing/etl";
import { calculateCrmMetrics, calculateOccupancyHeatmap, calculatePeriodStats, CustomerProfile, calculateVisitsHeatmap } from "@/lib/processing/crm"; // Updated
import { CrmCustomerBlock } from "./CrmCustomerBlock";
import { MachineAvailability } from "./MachineAvailability";
import { MachineAnalysis } from "./MachineAnalysis";
import { MachineGanttChart } from "./MachineGanttChart"; // New
import { CustomerDemographics } from "./CustomerDemographics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Users, TrendingUp, Calendar, Sun, Moon, Sunrise, DollarSign, Clock, Filter, Activity, BarChart3, Search, XCircle, ShoppingBasket, Phone } from "lucide-react";
import { CustomerDetails } from "./CustomerDetails";
import { cn } from "@/lib/utils";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { useSettings } from "@/components/context/SettingsContext"; // New
import { useWeatherAlerts } from "@/hooks/useWeatherAlerts"; // New
import { WeatherAlert } from "./WeatherAlert"; // New
import { CloudRain } from "lucide-react"; // New
import { SegmentedCustomer } from "@/lib/processing/crm"; // Existing import needed below


interface CrmDashboardProps {
    data: {
        records: SaleRecord[];
    };
    customers?: CustomerRecord[];
}

type PeriodOption = 'today' | 'yesterday' | 'thisMonth' | 'lastMonth' | 'custom';

export function CrmDashboard({ data, customers }: CrmDashboardProps) {
    const { getStoreAddress } = useSettings();
    // --- Optimized Date Initialization ---
    const { initialPeriod, initialRange } = useMemo(() => {
        const now = new Date();
        const startOfCurrentMonthTs = startOfMonth(now).getTime();
        const endOfCurrentMonthTs = endOfMonth(now).getTime();

        let hasDataThisMonth = false;
        let maxTs = 0;

        for (let i = 0; i < (data.records?.length || 0); i++) {
            const r = data.records[i];
            const ts = r.data instanceof Date ? r.data.getTime() : new Date(r.data).getTime();
            if (ts >= startOfCurrentMonthTs && ts <= endOfCurrentMonthTs) {
                hasDataThisMonth = true;
            }
            if (ts > maxTs) maxTs = ts;
        }

        const defaultRange = {
            start: format(startOfMonth(now), 'yyyy-MM-dd'),
            end: format(endOfMonth(now), 'yyyy-MM-dd')
        };

        if (!hasDataThisMonth && maxTs > 0) {
            const maxDate = new Date(maxTs);
            return {
                initialPeriod: 'custom' as PeriodOption,
                initialRange: {
                    start: format(startOfMonth(maxDate), 'yyyy-MM-dd'),
                    end: format(endOfMonth(maxDate), 'yyyy-MM-dd')
                }
            };
        }

        return { initialPeriod: 'thisMonth' as PeriodOption, initialRange: defaultRange };
    }, [data.records]);

    const [period, setPeriod] = useState<PeriodOption>(initialPeriod);
    const [customRange, setCustomRange] = useState(initialRange);

    // Wash/Dry Simulator State (Simplified for just Optimization)
    const [dryPriceSim, setDryPriceSim] = useState<string>("15.00");
    const [newDryPriceSim, setNewDryPriceSim] = useState<string>("");
    const [targetDryRatioSim, setTargetDryRatioSim] = useState<number>(70);

    // Search & Details State
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<CustomerProfile | null>(null);
    const [weatherAudienceModal, setWeatherAudienceModal] = useState<{ title: string, list: SegmentedCustomer[] } | null>(null);

    // --- Global Data (Always calculates on ALL records) ---
    // This is vital for Customer Profiles, Churn, LTV, etc.
    const globalCrmData = useMemo(() => {
        return calculateCrmMetrics(data.records, customers);
    }, [data.records, customers]);

    // Search Logic
    const searchResults = useMemo(() => {
        if (!searchTerm || searchTerm.length < 2) return [];
        const term = searchTerm.toLowerCase();
        return globalCrmData.profiles.filter(p =>
            p.name.toLowerCase().includes(term) ||
            (p.phone && p.phone.includes(term))
        ).slice(0, 5);
    }, [searchTerm, globalCrmData.profiles]);

    // --- Filtered Data (Period specific) ---
    // This is for Heatmap and Drying Optimization (Activity based)
    const filteredRecords = useMemo(() => {
        if (!data?.records) return [];

        const now = new Date();
        let interval: { start: Date; end: Date };

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
            default:
                interval = { start: startOfMonth(now), end: endOfMonth(now) };
        }

        return data.records.filter((r) => {
            if (!r.data) return false;
            const ts = r.data instanceof Date ? r.data.getTime() : new Date(r.data).getTime();
            return ts >= interval.start.getTime() && ts <= interval.end.getTime();
        });
    }, [data.records, period, customRange]);


    // --- Period specific calculations ---
    const { visitsHeatmapData, periodWashDryStats, periodStats, filteredMetrics } = useMemo(() => {
        // We re-use calculateCrmMetrics primarily to get the wash/dry stats for the period
        const periodMetrics = calculateCrmMetrics(filteredRecords, customers);
        // Calculate new Advanced Period Stats (with 180d lookback for new customers)
        const advPeriodStats = calculatePeriodStats(filteredRecords, data.records);

        console.log("Recalculating CRM Stats...", advPeriodStats.unclassifiedList.length, "unclassified");

        return {
            visitsHeatmapData: calculateVisitsHeatmap(filteredRecords),
            periodWashDryStats: periodMetrics.washDryStats,
            periodStats: advPeriodStats,
            filteredMetrics: periodMetrics
        };
    }, [filteredRecords, data.records]);

    // --- Dynamic Store Address ---
    // Extract the active store from the raw data since `filters` is not in this component's direct state
    let activeStore = 'DEFAULT';
    const firstStoreInRecords = data.records.find(r => r.loja)?.loja;
    const isSingleStore = new Set(data.records.map(r => r.loja)).size === 1;

    if (isSingleStore && firstStoreInRecords) {
        activeStore = firstStoreInRecords;
    }

    const settingsContext = useSettings();
    let storeAddress = settingsContext.getStoreAddress(activeStore);
    if (!storeAddress && activeStore === 'DEFAULT') {
        const firstConfigured = Object.values(settingsContext.storeSettings).find((s: any) => s.address);
        if (firstConfigured) storeAddress = firstConfigured.address;
    }

    // --- Dynamic Peak Days ---
    const topDays = useMemo(() => {
        // Use visitsHeatmapData (period or global based on filteredRecords)
        const heatmap = visitsHeatmapData;
        if (!heatmap || heatmap.length !== 7) return [];

        const DAYS_MAP = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
        const dayTotals = heatmap.map((hours: number[], index: number) => ({
            day: DAYS_MAP[index],
            total: hours.reduce((acc: number, count: number) => acc + count, 0)
        }));

        dayTotals.sort((a: any, b: any) => b.total - a.total);
        return dayTotals.slice(0, 3).map((d: any) => d.day);
    }, [visitsHeatmapData]);

    // Weather Alerts Hook
    const weatherAlerts = useWeatherAlerts(filteredMetrics.profiles, storeAddress || '', topDays);


    // --- Simulator C: Wash/Dry Optimization Logic (using Period Data) ---
    const currentDryPrice = parseFloat(dryPriceSim) || 15;
    const newDryPrice = parseFloat(newDryPriceSim);
    let extraRevenueDrying = 0;

    if (!isNaN(newDryPrice) && periodWashDryStats.washCount > 0) {
        const currentDryRevenue = periodWashDryStats.dryCount * currentDryPrice;
        const targetDryCount = periodWashDryStats.washCount * (targetDryRatioSim / 100);
        const projectedDryRevenue = targetDryCount * newDryPrice;

        if (projectedDryRevenue > currentDryRevenue) {
            extraRevenueDrying = projectedDryRevenue - currentDryRevenue;
        }
    }

    // Top 15 Clients (Always Global)
    const top15 = globalCrmData.profiles.slice(0, 15);

    return (
        <div className="space-y-8 animate-in fade-in">
            {/* Filter Bar */}
            <div className="bg-neutral-900/50 p-2 rounded-xl border border-neutral-800 flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2 px-3 text-neutral-400 border-r border-neutral-800 mr-2">
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Período</span>
                </div>
                {(['today', 'yesterday', 'thisMonth', 'lastMonth', 'custom'] as PeriodOption[]).map((opt) => (
                    <button key={opt} onClick={() => setPeriod(opt)} className={`px-4 py-2 text-sm rounded-lg transition-colors ${period === opt ? 'bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-500/20' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'}`}>
                        {opt === 'today' && 'Hoje'}
                        {opt === 'yesterday' && 'Ontem'}
                        {opt === 'thisMonth' && 'Mês Atual'}
                        {opt === 'lastMonth' && 'Mês Anterior'}
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

            {/* Search Bar */}
            <div className="relative">
                <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
                    <Search className="w-5 h-5 text-neutral-500 mr-3" />
                    <input
                        type="text"
                        placeholder="Buscar cliente por nome ou telefone..."
                        className="bg-transparent border-none outline-none text-neutral-200 w-full placeholder:text-neutral-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm("")} className="ml-2 text-neutral-500 hover:text-white">
                            <XCircle className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Search Results Dropdown */}
                {isSearchFocused && searchTerm.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        {searchResults.length > 0 ? (
                            <div className="divide-y divide-neutral-800">
                                {searchResults.map(profile => (
                                    <div
                                        key={profile.name}
                                        className="p-3 hover:bg-neutral-800 cursor-pointer flex items-center justify-between group"
                                        onClick={() => setSelectedProfile(profile)}
                                    >
                                        <div>
                                            <p className="font-medium text-white">{profile.name}</p>
                                            <p className="text-xs text-neutral-500">{profile.phone || 'Sem telefone'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-emerald-400">
                                                {profile.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </p>
                                            <p className="text-xs text-neutral-500">{profile.totalVisits} visitas</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-neutral-500">Nenhum cliente encontrado</div>
                        )}
                    </div>
                )}
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="bg-neutral-900 border border-neutral-800">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="machines">Análise de Máquinas</TabsTrigger>
                    <TabsTrigger value="availability">Disponibilidade (Filas)</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* Smart Rain Alert Banner */}
                    {!weatherAlerts.loading && weatherAlerts.isRainy && (
                        <WeatherAlert
                            isRainy={weatherAlerts.isRainy}
                            rainProbability={weatherAlerts.rainProbability}
                            expectedAmount={weatherAlerts.expectedAmount}
                            isPeakDay={weatherAlerts.isPeakDay}
                            audiences={weatherAlerts.targetAudiences}
                            onViewAudience={setWeatherAudienceModal}
                            storeAddress={storeAddress}
                        />
                    )}

                    {/* 1. KPIs Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <span className="text-sm font-medium text-neutral-400">Faturamento do Período</span>
                                <DollarSign className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div className="text-2xl font-bold text-white mt-2">
                                {filteredMetrics.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                                {(filteredMetrics.totalRevenue / (filteredMetrics.totalVisits || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ticket médio
                            </p>
                        </div>
                        <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <span className="text-sm font-medium text-neutral-400">Visitas Totais</span>
                                <Users className="h-4 w-4 text-indigo-500" />
                            </div>
                            <div className="text-2xl font-bold text-white mt-2">{filteredMetrics.totalVisits}</div>
                            <div className="flex gap-2 mt-1">
                                <span className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                                    {periodWashDryStats.washCount} Lavagens
                                </span>
                                <span className="text-xs px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded">
                                    {periodWashDryStats.dryCount} Secagens
                                </span>
                            </div>
                        </div>
                        <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <span className="text-sm font-medium text-neutral-400">Churn Rate (Global)</span>
                                <Activity className="h-4 w-4 text-rose-500" />
                            </div>
                            <div className="text-2xl font-bold text-white mt-2">{(globalCrmData.churnRate * 100).toFixed(1)}%</div>
                            <p className="text-xs text-neutral-500 mt-1">
                                {globalCrmData.activeCustomers} clientes ativos
                            </p>
                        </div>
                        <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <span className="text-sm font-medium text-neutral-400">Cestos Totais</span>
                                <ShoppingBasket className="h-4 w-4 text-amber-500" />
                            </div>
                            <div className="text-2xl font-bold text-white mt-2">
                                {periodWashDryStats.totalBaskets}
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                                Soma Lavagem + Secagem
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        {/* 2. Customer Segmentation Block (Col Span 4) */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-4">
                            <CrmCustomerBlock
                                periodStats={periodStats}
                                onSelectSegment={(segment) => {
                                    // Logic to open details could go here, or just filter list
                                    console.log("Selected Segment:", segment);
                                }}
                            />
                        </div>

                        {/* 3. Drying Optimization Simulator (Col Span 3) */}
                        <div className="col-span-3 bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="w-5 h-5 text-indigo-500" />
                                <h3 className="font-bold text-white">Otimização de Secagem</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-neutral-400">Taxa de Conversão Atual</span>
                                        <span className="text-white font-medium">{periodWashDryStats.conversionRate.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(periodWashDryStats.conversionRate, 100)}%` }}></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-neutral-500 block mb-1">Preço Atual Sec.</label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1.5 text-neutral-500 text-xs">R$</span>
                                            <input
                                                type="number"
                                                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 pl-6 text-sm text-white focus:border-indigo-500 outline-none"
                                                value={dryPriceSim}
                                                onChange={(e) => setDryPriceSim(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-emerald-500 block mb-1">Novo Preço (Sim)</label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1.5 text-neutral-500 text-xs">R$</span>
                                            <input
                                                type="number"
                                                className="w-full bg-neutral-950 border border-emerald-900/50 rounded px-2 py-1 pl-6 text-sm text-emerald-400 focus:border-emerald-500 outline-none"
                                                value={newDryPriceSim}
                                                onChange={(e) => setNewDryPriceSim(e.target.value)}
                                                placeholder="Ex: 12.00"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-neutral-400">Meta Conversão: {targetDryRatioSim}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="50"
                                        max="100"
                                        className="w-full accent-indigo-500"
                                        value={targetDryRatioSim}
                                        onChange={(e) => setTargetDryRatioSim(parseInt(e.target.value))}
                                    />
                                </div>

                                {extraRevenueDrying > 0 && (
                                    <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-in slide-in-from-bottom-2">
                                        <p className="text-xs text-emerald-400 font-medium mb-1">Potencial de Ganho Extra</p>
                                        <p className="text-lg font-bold text-emerald-400">
                                            +{extraRevenueDrying.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </p>
                                        <p className="text-[10px] text-emerald-600/70 mt-1 leading-tight">
                                            Reduzindo preço para R$ {parseFloat(newDryPriceSim).toFixed(2)} e atingindo {targetDryRatioSim}% de conversão.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>



                    {/* 5. Visits Heatmap - FULL WIDTH */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 overflow-hidden mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-500" />
                                    Mapa de Calor: Visitas de Clientes
                                </h3>
                                <p className="text-sm text-neutral-500">Fluxo de pessoas por dia e horário (Início de Ciclo)</p>
                            </div>
                            <div className="flex text-xs gap-2">
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-neutral-800 rounded-sm"></div> Livre</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-900 rounded-sm"></div> Baixo</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-600 rounded-sm"></div> Médio</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-400 rounded-sm"></div> Alto</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto pb-2">
                            <div className="min-w-[800px]">
                                <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-1 mb-1">
                                    <div className="w-16"></div>
                                    {Array.from({ length: 24 }).map((_, i) => (
                                        <div key={i} className="text-[10px] text-neutral-500 text-center font-mono">{i}h</div>
                                    ))}
                                </div>

                                {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day, d) => (
                                    <div key={day} className="grid grid-cols-[auto_repeat(24,1fr)] gap-1 mb-1 items-center">
                                        <div className="w-16 text-xs text-neutral-400 font-medium">{day.slice(0, 3)}</div>
                                        {Array.from({ length: 24 }).map((_, h) => {
                                            const count = visitsHeatmapData[d]?.[h] || 0;
                                            const max = Math.max(...visitsHeatmapData.flat());
                                            const intensity = max > 0 ? count / max : 0;

                                            let bgClass = "bg-neutral-800/50";
                                            if (intensity > 0.1) bgClass = "bg-blue-900/70";
                                            if (intensity > 0.25) bgClass = "bg-blue-800";
                                            if (intensity > 0.50) bgClass = "bg-blue-600";
                                            if (intensity > 0.75) bgClass = "bg-blue-400";

                                            return (
                                                <div
                                                    key={h}
                                                    className={cn("h-8 rounded-sm transition-all hover:scale-110 cursor-help relative group", bgClass)}
                                                >
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                                                        {count} visitas
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 5. Top 15 Clients Table (Global) */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-neutral-800">
                            <h3 className="text-xl font-bold text-white">Top 15 Melhores Clientes</h3>
                            <p className="text-sm text-neutral-500">Baseado no volume total de gastos (Vitalício)</p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-neutral-950 text-neutral-400 uppercase font-medium">
                                    <tr>
                                        <th className="px-6 py-4">Ranking</th>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4 text-center">Visitas</th>
                                        <th className="px-6 py-4 text-center">Ticket Médio</th>
                                        <th className="px-6 py-4 text-center">Média Cestos</th>
                                        <th className="px-6 py-4 text-center">Dia Preferido</th>
                                        <th className="px-6 py-4 text-center">Turno</th>
                                        <th className="px-6 py-4 text-right">Total Gasto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800 text-neutral-300">
                                    {top15.map((profile, i) => (
                                        <tr
                                            key={i}
                                            onClick={() => setSelectedProfile(profile)}
                                            className="hover:bg-neutral-800/50 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4 font-bold text-neutral-500">#{i + 1}</td>
                                            <td className="px-6 py-4 font-medium text-white">{profile.name}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-neutral-800 px-2 py-1 rounded text-xs">{profile.totalVisits}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-emerald-400">
                                                {profile.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="px-6 py-4 text-center text-neutral-600">
                                                -
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Calendar className="w-3 h-3 text-neutral-500" />
                                                    {profile.topDay}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {profile.topShift === 'Manhã' && <Sunrise className="w-3 h-3 text-amber-400" />}
                                                    {profile.topShift === 'Tarde' && <Sun className="w-3 h-3 text-orange-400" />}
                                                    {profile.topShift === 'Noite' && <Moon className="w-3 h-3 text-blue-400" />}
                                                    {profile.topShift}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-white">
                                                {profile.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="machines">
                    <MachineAnalysis data={{ records: data.records }} />
                </TabsContent>

                <TabsContent value="availability">
                    <MachineAvailability records={filteredRecords.length > 0 ? filteredRecords : data.records} />
                </TabsContent>
            </Tabs>

            <CustomerDetails
                isOpen={!!selectedProfile}
                onClose={() => setSelectedProfile(null)}
                profile={selectedProfile}
                periodRecords={filteredRecords}
            />

            {/* Weather Audience Modal (Reuses the Customer Block Modal logic visually but standalone) */}
            {weatherAudienceModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-neutral-900 border border-blue-500/30 w-full max-w-4xl h-[80vh] rounded-2xl flex flex-col shadow-[0_0_50px_rgba(59,130,246,0.15)] animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-blue-900/50 flex justify-between items-center bg-blue-950/20 rounded-t-2xl">
                            <div>
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <CloudRain className="w-6 h-6 text-blue-400" />
                                    {weatherAudienceModal.title}
                                </h3>
                                <p className="text-neutral-400 text-sm mt-1">
                                    {weatherAudienceModal.list.length} clientes recomendados para ação hoje.
                                </p>
                            </div>
                            <button
                                onClick={() => setWeatherAudienceModal(null)}
                                className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content Table */}
                        <div className="flex-1 overflow-auto p-0">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-neutral-950 text-neutral-400 uppercase font-medium sticky top-0 z-10 shadow-sm border-b border-neutral-800">
                                    <tr>
                                        <th className="px-6 py-4">Cliente / Info</th>
                                        <th className="px-6 py-4 text-center">Lavagens</th>
                                        <th className="px-6 py-4 text-center">Secagens</th>
                                        <th className="px-6 py-4 text-right">LTV Global</th>
                                        <th className="px-6 py-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800 text-neutral-300">
                                    {weatherAudienceModal.list.map((c, i) => (
                                        <tr key={i} className="hover:bg-neutral-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white text-left">
                                                    {c.name}
                                                </div>
                                                <div className="text-xs text-neutral-500 font-mono mt-0.5 flex items-center gap-2">
                                                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone || "-"}</span>
                                                    <span className="text-neutral-600">|</span>
                                                    <span className="text-amber-500">{c.debugInfo}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${c.wCount > 0 ? 'bg-blue-500/10 text-blue-400' : 'text-neutral-600'}`}>
                                                    {c.wCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${c.dCount > 0 ? 'bg-orange-500/10 text-orange-400' : 'text-neutral-600'}`}>
                                                    {c.dCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono">
                                                {c.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {c.phone ? (
                                                    <a
                                                        href={`https://wa.me/55${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${c.name.split(' ')[0]}! Vi que a previsão hoje é de chuva 🌧️. Que tal aproveitar para lavar e SECAR suas roupas rapidinho aqui na Lavly? 🧺✨`)}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold bg-green-600 hover:bg-green-500 rounded-lg transition-all shadow-lg shadow-green-900/20"
                                                    >
                                                        <Phone className="w-3 h-3" />
                                                        WhatsApp
                                                    </a>
                                                ) : (
                                                    <span className="text-neutral-600 text-xs italic">Sem contato</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {weatherAudienceModal.list.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center py-12 text-neutral-500">
                                                Nenhum cliente neste segmento.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
