import React, { useMemo, useState, useEffect } from "react";
import { SaleRecord } from "@/lib/processing/etl";
import { Wrench, Trophy, TrendingUp, AlertCircle, BarChart3, Activity, Calendar, Filter } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { MachineGanttChart } from "./MachineGanttChart";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";

interface MachineAnalysisProps {
    data?: any; // Mantido para compatibilidade, ignorado
    selectedStore?: string;
}

type PeriodOption = 'today' | 'yesterday' | 'thisMonth' | 'lastMonth';

export function MachineAnalysis({ selectedStore }: MachineAnalysisProps) {
    const [period, setPeriod] = useState<PeriodOption>('today');
    const [isLoading, setIsLoading] = useState(true);
    const [payload, setPayload] = useState<any>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchMachines = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/metrics/machines?store=${encodeURIComponent(selectedStore || 'Todas')}&period=${period}`);
                const json = await res.json();
                if (isMounted && json.success) {
                    setPayload(json.payload);
                }
            } catch (err) {
                console.error("Failed to load machine data", err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        fetchMachines();
        return () => { isMounted = false; };
    }, [selectedStore, period]);

    if (isLoading) {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="h-12 w-full max-w-2xl bg-neutral-900 rounded-xl animate-pulse"></div>
                <div className="h-[200px] w-full bg-neutral-900/40 rounded-xl animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-32 bg-neutral-900/40 rounded-xl animate-pulse"></div>
                    <div className="h-32 bg-neutral-900/40 rounded-xl animate-pulse"></div>
                </div>
            </div>
        );
    }

    const { machines, summary, topRevenueMachine, topCyclesMachine, rawOrders } = payload || { machines: [], summary: {}, rawOrders: [] };

    // Show empty state only if NO records exist at all
    if (!machines || machines.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-neutral-500">
                <Wrench className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg">Nenhum dado de máquina encontrado no período.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">

            {/* Header with Filter - Styled like CrmDashboard */}
            <div className="bg-neutral-900/50 p-2 rounded-xl border border-neutral-800 flex flex-wrap gap-2 items-center mb-6">
                <div className="flex items-center gap-2 px-3 text-neutral-400 border-r border-neutral-800 mr-2">
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Período</span>
                </div>
                {(['today', 'yesterday', 'thisMonth', 'lastMonth'] as PeriodOption[]).map((opt) => (
                    <button
                        key={opt}
                        onClick={() => setPeriod(opt)}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${period === opt ? 'bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-500/20' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'}`}
                    >
                        {opt === 'today' && 'Hoje'}
                        {opt === 'yesterday' && 'Ontem'}
                        {opt === 'thisMonth' && 'Mês Atual'}
                        {opt === 'lastMonth' && 'Mês Anterior'}
                    </button>
                ))}
            </div>

            {/* 1. Machine Gantt Chart (Moved here) */}
            <div className="mb-8">
                <MachineGanttChart records={rawOrders.map((o: any) => ({
                    data: o.data instanceof Date ? o.data : new Date(o.data),
                    cliente: o.cliente || '',
                    valor: o.valor || o.value,
                    produto: o.service,
                    items: [{
                        machine: o.machine,
                        service: o.service,
                        startTime: o.data instanceof Date ? o.data : new Date(o.data),
                        value: o.valor || o.value
                    }]
                })) as any} />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-900/10 dark:to-neutral-900 border-yellow-200 dark:border-yellow-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-500">
                            Campeã de Faturamento
                        </CardTitle>
                        <Trophy className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">{topRevenueMachine?.id || '-'}</div>
                        <p className="text-xs text-neutral-500">
                            {(topRevenueMachine?.totalRevenue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            <span className="ml-1 text-green-600 font-medium">
                                ({((topRevenueMachine?.revenueShare || 0) * 100).toFixed(1)}% do total)
                            </span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-neutral-900 border-blue-200 dark:border-blue-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-500">
                            Mais Utilizada
                        </CardTitle>
                        <Activity className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">{topCyclesMachine?.id || '-'}</div>
                        <p className="text-xs text-neutral-500">
                            {(topCyclesMachine?.cycles || 0).toLocaleString('pt-BR')} Ciclos
                            <span className="ml-1 text-blue-600 font-medium">
                                ({((topCyclesMachine?.cycleShare || 0) * 100).toFixed(1)}% do total)
                            </span>
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-neutral-500" />
                        Detalhamento das máquinas
                    </CardTitle>
                    <CardDescription>
                        Lista completa de máquinas com faturamento e ciclos
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Máquina</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Ciclos</TableHead>
                                <TableHead className="text-right">Share (Ciclos)</TableHead>
                                <TableHead className="text-right">Faturamento</TableHead>
                                <TableHead className="text-right">Share (R$)</TableHead>
                                <TableHead className="text-right">Ticket Médio</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {machines.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell className="font-medium">{m.id}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs ${m.type === 'Lavadora' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                            m.type === 'Secadora' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-neutral-800'
                                            }`}>
                                            {m.type}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right text-neutral-300">{m.cycles.toLocaleString('pt-BR')}</TableCell>
                                    <TableCell className="text-right text-neutral-500">{(m.cycleShare * 100).toFixed(1)}%</TableCell>
                                    <TableCell className="text-right font-medium text-emerald-400">
                                        {m.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </TableCell>
                                    <TableCell className="text-right text-neutral-500">{(m.revenueShare * 100).toFixed(1)}%</TableCell>
                                    <TableCell className="text-right text-xs text-neutral-500">
                                        {m.avgTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {machines.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-neutral-500">
                                        Nenhum dado encontrado para o período selecionado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Faturamento por Máquina</CardTitle>
                        <CardDescription>Comparativo de receita gerada</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={machines} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="id" type="category" width={80} tick={{ fontSize: 11, fill: '#737373' }} />
                                <Tooltip
                                    formatter={(value: any) => {
                                        const numValue = Number(value || 0);
                                        return [`R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita'];
                                    }}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #333', backgroundColor: '#171717', color: '#fff' }}
                                />
                                <Bar dataKey="totalRevenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Ciclos por Máquina</CardTitle>
                        <CardDescription>Volume de utilização</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={machines} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="id" type="category" width={80} tick={{ fontSize: 11, fill: '#737373' }} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #333', backgroundColor: '#171717', color: '#fff' }}
                                />
                                <Bar dataKey="cycles" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
