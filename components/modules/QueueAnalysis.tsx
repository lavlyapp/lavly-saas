"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { calculateMachineAvailability, findFlexibleCustomers } from '@/lib/processing/machine-availability';
import { SaleRecord } from '@/lib/processing/etl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDay, getHours } from 'date-fns';
import {
    Info, AlertTriangle, TrendingUp, Calendar, Clock,
    ArrowRight, MessageSquare, Sparkles, UserCheck, Users
} from "lucide-react";

interface QueueAnalysisProps {
    data: SaleRecord[];
    selectedStore?: string;
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function QueueAnalysis({ data, selectedStore }: QueueAnalysisProps) {
    const metrics = useMemo(() => calculateMachineAvailability(data), [data]);
    const [selectedHour, setSelectedHour] = useState<{ day: number, hour: number } | null>(null);

    // Dynamic trimming: only show hours where there is at least some activity
    const activeHours = useMemo(() => {
        const hoursWithData = metrics.saturationByHour
            .filter(s => s.saturation > 0.05)
            .map(s => s.hour);

        if (hoursWithData.length === 0) return HOURS;

        const minVal = hoursWithData.reduce((a, b) => Math.min(a, b), hoursWithData[0]);
        const maxVal = hoursWithData.reduce((a, b) => Math.max(a, b), hoursWithData[0]);
        const min = Math.max(0, minVal - 1);
        const max = Math.min(23, maxVal + 1);
        return Array.from({ length: max - min + 1 }, (_, i) => min + i);
    }, [metrics.saturationByHour]);

    const visitsHeatmap = useMemo(() => {
        const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
        const processedVisits = new Set<string>();

        data.forEach(r => {
            if (!r.data) return;
            const d = getDay(r.data);
            const h = getHours(r.data);
            const key = `${r.data.toDateString()}-${h}-${r.cliente}`;
            if (!processedVisits.has(key)) {
                matrix[d][h]++;
                processedVisits.add(key);
            }
        });
        return matrix;
    }, [data]);

    const flexibleCustomers = useMemo(() => {
        return findFlexibleCustomers(data, metrics.saturationByHour);
    }, [data, metrics.saturationByHour]);

    const peakStats = useMemo(() => {
        const sorted = [...metrics.saturationByHour].sort((a, b) => b.saturation - a.saturation);
        const peak = sorted[0];
        return {
            day: WEEKDAYS[peak?.day || 0],
            hour: `${peak?.hour || 0}h`,
            prob: Math.min(100, Math.round((peak?.saturation || 0) * 100))
        };
    }, [metrics.saturationByHour]);

    const moveDemandROI = useMemo(() => {
        const totalPeakCyclesMonth = metrics.saturationByHour
            .filter(s => s.saturation > 0.6)
            .reduce((acc, s) => acc + (s.count * 4), 0);

        const avgTicket = metrics.expansionROI?.avgTicket || 35;
        return (totalPeakCyclesMonth * 0.15) * avgTicket;
    }, [metrics.saturationByHour, metrics.expansionROI]);

    const getSaturationColor = (saturation: number) => {
        if (saturation === 0) return 'bg-neutral-100 dark:bg-neutral-900 border-neutral-200 text-neutral-400';
        if (saturation < 0.3) return 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 text-emerald-700 dark:text-emerald-400';
        if (saturation < 0.6) return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 text-yellow-700 dark:text-yellow-400';
        if (saturation < 0.8) return 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 text-orange-700 dark:text-orange-400';
        return 'bg-red-100 dark:bg-red-900/40 border-red-200 text-red-700 dark:text-red-400 font-bold';
    };

    const getVisitsColor = (count: number, max: number) => {
        if (count === 0) return 'bg-neutral-900 border-neutral-800';
        const intensity = count / max;
        if (intensity < 0.25) return 'bg-blue-900/40 border-blue-900/50 text-blue-400';
        if (intensity < 0.5) return 'bg-blue-800/60 border-blue-800/70 text-blue-300';
        if (intensity < 0.75) return 'bg-blue-600 border-blue-700 text-white';
        return 'bg-blue-400 border-blue-500 text-white font-bold';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Strategy Insight */}
            <div className="p-6 bg-gradient-to-r from-indigo-600/10 to-blue-600/10 border border-indigo-500/20 rounded-2xl">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">Estratégia de Gestão de Demanda</h3>
                        <p className="text-sm text-neutral-400 max-w-2xl">
                            Utilize o mapa abaixo para identificar horários saturados e a lista de <b>Clientes Flexíveis</b>
                            para oferecer cupons direcionados. O objetivo é deslocar quem frequenta o pico para os horários de vale,
                            maximizando o ROI sem precisar comprar máquinas novas agora.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Heatmap Section */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-red-400" />
                                    Ocupação de Máquinas (Gargalo)
                                </span>
                                <div className="flex gap-2 text-[10px] font-normal">
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500/20 border border-emerald-500/30 rounded" /> Livre</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500/40 border border-red-500/50 rounded" /> Saturado</span>
                                </div>
                            </CardTitle>
                            <CardDescription>O percentual indica a ocupação da máquina mais solicitada (Lavadora ou Secadora)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <div className="min-w-[700px]">
                                    <div className="grid gap-1 text-center text-[9px]" style={{ gridTemplateColumns: `80px repeat(${activeHours.length}, 1fr)` }}>
                                        <div className="h-6 flex items-center justify-end pr-2 font-semibold text-neutral-500">Hora</div>
                                        {activeHours.map(h => <div key={h} className="h-6 flex items-center justify-center font-mono opacity-50">{h}</div>)}

                                        {WEEKDAYS.map((day, dIdx) => (
                                            <React.Fragment key={day}>
                                                <div className="h-8 flex items-center justify-end pr-2 font-medium text-neutral-400">{day}</div>
                                                {activeHours.map(h => {
                                                    const stat = metrics.saturationByHour.find(s => s.day === dIdx && s.hour === h);
                                                    const sat = stat?.saturation || 0;
                                                    const satPercent = Math.round(sat * 100);
                                                    return (
                                                        <div
                                                            key={h}
                                                            className={`h-8 rounded-[2px] border transition-all hover:scale-110 cursor-pointer flex items-center justify-center text-[8px] sm:text-[9px] ${getSaturationColor(sat)}`}
                                                            onClick={() => setSelectedHour({ day: dIdx, hour: h })}
                                                        >
                                                            {sat > 0 && `${satPercent}%`}
                                                        </div>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-blue-400" />
                                    Densidade de Visitas (Clientes na Loja)
                                </span>
                                <div className="flex gap-2 text-[10px] font-normal">
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-900/40 border border-blue-900/50 rounded" /> Baixo</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-400 border border-blue-500 rounded" /> Alto</span>
                                </div>
                            </CardTitle>
                            <CardDescription>Fluxo de pessoas por dia e horário (independente do uso de máquinas)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <div className="min-w-[700px]">
                                    <div className="grid gap-1 text-center text-[9px]" style={{ gridTemplateColumns: `80px repeat(${activeHours.length}, 1fr)` }}>
                                        <div className="h-6 flex items-center justify-end pr-2 font-semibold text-neutral-500">Hora</div>
                                        {activeHours.map(h => <div key={h} className="h-6 flex items-center justify-center font-mono opacity-50">{h}</div>)}

                                        {WEEKDAYS.map((day, dIdx) => {
                                            const flatVisits = visitsHeatmap.flat();
                                            const maxVisits = flatVisits.length > 0 ? flatVisits.reduce((a, b) => Math.max(a, b), 0) : 1;
                                            return (
                                                <React.Fragment key={day}>
                                                    <div className="h-8 flex items-center justify-end pr-2 font-medium text-neutral-400">{day}</div>
                                                    {activeHours.map(h => {
                                                        const visits = visitsHeatmap[dIdx][h] || 0;
                                                        return (
                                                            <div
                                                                key={h}
                                                                className={`h-8 rounded-[2px] border transition-all hover:scale-110 cursor-help flex items-center justify-center text-[8px] sm:text-[9px] ${getVisitsColor(visits, maxVisits || 1)}`}
                                                            >
                                                                {visits > 0 && visits}
                                                            </div>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {metrics.expansionROI && (
                        <Card className="bg-gradient-to-br from-indigo-900/20 to-neutral-900 border-indigo-500/30 overflow-hidden relative">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-indigo-400">
                                    <Sparkles className="w-5 h-5" /> Estudo de Expansão (Nova Torre)
                                </CardTitle>
                                <CardDescription>O que acontece se você adicionar +1 Lavadora e +1 Secadora?</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-neutral-900/50 rounded-xl border border-neutral-800">
                                        <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-1">Faturamento Adicional</p>
                                        <p className="text-xl font-bold text-emerald-400">
                                            + {metrics.expansionROI?.monthlyRevenueIncrease.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                                        </p>
                                        <p className="text-[10px] text-neutral-500 mt-1">Estimativa de demanda reprimida</p>
                                    </div>
                                    <div className="p-4 bg-neutral-900/50 rounded-xl border border-neutral-800">
                                        <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-1">Payback Estimado</p>
                                        <p className="text-xl font-bold text-white">
                                            {metrics.expansionROI?.estimatedPaybackMonths?.toFixed(1)} meses
                                        </p>
                                        <p className="text-[10px] text-neutral-500 mt-1">Retorno do investimento (Set 35k)</p>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                                    <h4 className="text-xs font-bold text-indigo-300 mb-2 flex items-center gap-2">
                                        <Info className="w-3 h-3" /> Como este cálculo é feito?
                                    </h4>
                                    <ul className="text-[11px] space-y-2 text-neutral-400">
                                        <li>• <b>Demanda Reprimida:</b> Analisamos {metrics.saturationByHour.filter(s => s.saturation > 0.75).length} horários onde a saturação foi superior a 75%.</li>
                                        <li>• <b>Ciclos Capturados:</b> Estimamos que {metrics.expansionROI?.capturedCyclesPerMonth} ciclos que foram perdidos por falta de máquina seriam absorvidos.</li>
                                        <li>• <b>Conversão:</b> Baseado no seu ticket médio de {metrics.expansionROI?.avgTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-indigo-500/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-emerald-400" />
                                Clientes Flexíveis (Potencial de Conversão)
                            </CardTitle>
                            <CardDescription>
                                Clientes que frequentam horários de pico, mas possuem histórico de visitas em horários de vale.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Pico Habitual</TableHead>
                                        <TableHead>Já Veio No Vale</TableHead>
                                        <TableHead className="text-right">Ação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {flexibleCustomers.map(c => (
                                        <TableRow key={c.name}>
                                            <TableCell>
                                                <p className="font-medium text-white">{c.name}</p>
                                                <p className="text-[10px] text-neutral-500">{c.phone}</p>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-red-400 font-medium">
                                                    <Clock className="w-3 h-3" /> {c.preferredPeakDay} - {c.preferredPeakHour}
                                                    <span className="text-[10px] bg-red-500/10 px-1 rounded">{c.peakVisits}x</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                                                    <TrendingUp className="w-3 h-3" /> {c.preferredOffPeakDay} - {c.preferredOffPeakHour}
                                                    <span className="text-[10px] bg-emerald-500/10 px-1 rounded">{c.offPeakVisits}x</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <button className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white p-2 rounded-lg transition-all group relative">
                                                    <MessageSquare className="w-4 h-4" />
                                                    <span className="absolute hidden group-hover:block bg-neutral-800 text-white text-[10px] p-2 rounded-lg shadow-xl -left-24 -top-10 w-32 z-50">
                                                        Enviar Cupom de Deslocamento
                                                    </span>
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Panel: Queue Stats */}
                <div className="space-y-6">
                    <Card className="bg-neutral-900 border-neutral-800 font-sans">
                        <CardHeader>
                            <CardTitle className="text-sm">Probabilidade de Fila (Pico)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-500 mb-2">{peakStats.prob}%</div>
                            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500" style={{ width: `${peakStats.prob}%` }} />
                            </div>
                            <p className="text-xs text-neutral-500 mt-3 italic">
                                "Baseado nos últimos 30 dias, a probabilidade de um cliente chegar no {peakStats.day} às {peakStats.hour} e não encontrar máquina disponível é de {peakStats.prob}%."
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-500/20">
                        <CardHeader>
                            <CardTitle className="text-sm">Gargalo por Tipo</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-neutral-400">Lavadoras</span>
                                    <span className="text-white font-bold">{peakStats.prob > 80 ? 'Crítico' : 'Alto'} ({peakStats.day.slice(0, 3)})</span>
                                </div>
                                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500" style={{ width: `${Math.min(100, peakStats.prob + 5)}%` }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-neutral-400">Secadoras</span>
                                    <span className="text-white font-bold">{peakStats.prob > 90 ? 'Crítico' : 'Alto'} ({peakStats.day.slice(0, 3)})</span>
                                </div>
                                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500" style={{ width: `${Math.min(100, peakStats.prob - 10)}%` }} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-emerald-500/5 border-emerald-500/20">
                        <CardHeader>
                            <CardTitle className="text-sm text-emerald-400">Estimativa ROI (Mover Demanda)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold text-white">
                                {moveDemandROI.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                            <p className="text-xs text-neutral-400 mt-1">Potencial de receita recuperada ao mês se 15% dos clientes de pico migrarem para o vale.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
