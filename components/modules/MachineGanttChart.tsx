"use client"

import { SaleRecord } from "@/lib/processing/etl";
import { getCycleDuration } from "@/lib/processing/crm";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, addMinutes, startOfDay, endOfDay } from "date-fns";

import { Clock, Calendar, Search, ArrowRight, Zap, RefreshCw, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

interface MachineGanttChartProps {
    records: SaleRecord[];
}

export function MachineGanttChart({ records }: MachineGanttChartProps) {
    const [selectedDate, setSelectedDate] = useState<string>(
        records.length > 0 ? format(records[records.length - 1].data, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    );

    // 1. Group records by Machine
    const timelineData = useMemo(() => {
        if (!selectedDate) return [];

        // Filter for selected date
        const dailyRecords = records.filter(r =>
            format(r.data, 'yyyy-MM-dd') === selectedDate
        );

        // Grouping
        const machines: Record<string, { start: Date; end: Date; type: 'wash' | 'dry'; client: string; value: number }[]> = {};

        dailyRecords.forEach(r => {
            // Try to get machine name from items (if enriched) or fallback
            let machineName = "Desconhecida";
            if (r.items && r.items.length > 0) {
                machineName = r.items[0].machine;
            }

            // Clean Machine Name
            machineName = machineName.replace(/Maquina\s*/i, 'Máquina ').trim();
            if (machineName === "Desconhecida") return; // Skip unknown machines for cleaner chart

            if (!machines[machineName]) machines[machineName] = [];

            const duration = getCycleDuration(r.produto);
            const end = addMinutes(r.data, duration);

            machines[machineName].push({
                start: r.data,
                end,
                type: duration > 40 ? 'dry' : 'wash',
                client: r.cliente,
                value: r.valor
            });
        });

        // Sort machines: Washers first, then Dryers. Within type, by number.
        return Object.entries(machines).sort((a, b) => {
            const nameA = a[0].toLowerCase();
            const nameB = b[0].toLowerCase();

            // Identify type
            const isDryA = nameA.includes('secadora') || nameA.includes('sec');
            const isDryB = nameB.includes('secadora') || nameB.includes('sec');

            // 1. Primary Sort: Type (Wash before Dry)
            if (isDryA !== isDryB) {
                return isDryA ? 1 : -1; // If A is dry, it goes after
            }

            // 2. Secondary Sort: Number
            const numA = parseInt(nameA.replace(/\D/g, '')) || 0;
            const numB = parseInt(nameB.replace(/\D/g, '')) || 0;
            return numA - numB;
        });

    }, [records, selectedDate]);

    // Available Dates for Dropdown
    const availableDates = useMemo(() => {
        const dates = new Set(records.map(r => format(r.data, 'yyyy-MM-dd')));
        return Array.from(dates).sort().reverse();
    }, [records]);

    // Helper to calculate position
    const getPosition = (date: Date) => {
        const start = startOfDay(date);
        const totalMinutes = 24 * 60;
        const diffMinutes = (date.getTime() - start.getTime()) / (1000 * 60);
        return (diffMinutes / totalMinutes) * 100;
    };

    const getWidth = (start: Date, end: Date) => {
        const totalMinutes = 24 * 60;
        const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        return (diffMinutes / totalMinutes) * 100;
    };

    return (
        <Card className="col-span-1 border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 text-neutral-100 shadow-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-800/50 pb-4 bg-black/20">
                <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <Clock className="w-5 h-5 text-indigo-400" />
                        </div>
                        Uso das Máquinas
                        <span className="text-sm font-normal text-neutral-500 ml-2 border-l border-neutral-700 pl-2">
                            Linha do Tempo (Gantt)
                        </span>
                    </CardTitle>
                    <CardDescription className="text-neutral-400 mt-1 flex items-center gap-2">
                        Acompanhe a ocupação e ciclos em tempo real
                    </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg flex items-center px-3 py-1.5 gap-2 shadow-inner">
                        <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                        <select
                            className="bg-transparent text-sm text-neutral-300 focus:outline-none cursor-pointer font-medium"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        >
                            {availableDates.map(date => {
                                const d = new Date(date);
                                const dayStr = format(d, "dd/MM");
                                const weekStr = format(d, "EEE");
                                const weekCap = weekStr.charAt(0).toUpperCase() + weekStr.slice(1);
                                return (
                                    <option key={date} value={date} className="bg-neutral-900">
                                        {`${dayStr} - ${weekCap}`}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="relative min-h-[400px] overflow-x-auto custom-scrollbar">

                    {/* Time Scale Overlay (Sticky Top) */}
                    <div className="sticky top-0 z-20 bg-neutral-900/95 backdrop-blur border-b border-neutral-800 flex min-w-[1000px]">
                        <div className="w-32 flex-shrink-0 p-3 text-xs font-bold text-neutral-500 uppercase tracking-wider border-r border-neutral-800 bg-neutral-900/90 z-30 sticky left-0">
                            Máquina
                        </div>
                        <div className="flex-1 relative h-10">
                            {Array.from({ length: 25 }).map((_, i) => (
                                <div key={i} className="absolute top-0 bottom-0 border-l border-neutral-800/30 flex items-center justify-center pointer-events-none" style={{ left: `${i * 4.16}%` }}>
                                    <span className="text-[10px] text-neutral-600 bg-neutral-900 px-1 -translate-y-px">{i}h</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Gantt Rows */}
                    <div className="min-w-[1000px] divide-y divide-neutral-800/50">
                        {timelineData.map(([machine, cycles], index) => (
                            <div key={machine} className={cn(
                                "relative flex h-14 hover:bg-white/[0.02] transition-colors group",
                                index % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"
                            )}>
                                {/* Machine Label (Sticky Left) */}
                                <div className="w-32 flex-shrink-0 sticky left-0 bg-neutral-900/95 border-r border-neutral-800 z-10 flex items-center px-4 font-medium text-sm text-neutral-300 group-hover:text-white transition-colors shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full mr-2",
                                        cycles.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-neutral-700"
                                    )}></div>
                                    {machine}
                                </div>

                                {/* Timeline Track */}
                                <div className="flex-1 h-full relative">
                                    {/* Grid Lines (Background) */}
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <div key={i} className="absolute h-full w-px bg-neutral-800/10 pointer-events-none" style={{ left: `${(i + 1) * 8.33}%` }}></div>
                                    ))}

                                    {/* Cycle Bars */}
                                    {cycles.map((cycle, idx) => {
                                        const left = getPosition(cycle.start);
                                        const width = getWidth(cycle.start, cycle.end);

                                        if (left < 0 || left > 100) return null;

                                        return (
                                            <div
                                                key={idx}
                                                className={cn(
                                                    "absolute top-1/2 -translate-y-1/2 h-8 rounded-md cursor-pointer transition-all hover:scale-105 hover:z-20 shadow-lg border-t border-white/10 group-bar",
                                                    cycle.type === 'wash'
                                                        ? "bg-gradient-to-b from-blue-500 to-blue-600 shadow-blue-900/20"
                                                        : "bg-gradient-to-b from-amber-500 to-amber-600 shadow-amber-900/20"
                                                )}
                                                style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }} // Min width handle
                                            >
                                                {/* Cycle Content */}
                                                <div className="w-full h-full flex items-center justify-center px-1 overflow-hidden relative">
                                                    {/* Icon */}
                                                    {width > 2 && (
                                                        cycle.type === 'wash'
                                                            ? <RefreshCw className="w-3 h-3 text-blue-100 opacity-80" />
                                                            : <Wind className="w-3 h-3 text-amber-100 opacity-80" />
                                                    )}
                                                </div>

                                                {/* Tooltip (Custom Implementation) */}
                                                <div className="opacity-0 group-bar-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-neutral-900 border border-neutral-700 p-3 rounded-lg shadow-2xl z-30 w-48 pointer-events-none">
                                                    <div className="flex items-center gap-2 mb-1 border-b border-neutral-800 pb-1">
                                                        <div className={cn("w-2 h-2 rounded-full", cycle.type === 'wash' ? "bg-blue-500" : "bg-amber-500")}></div>
                                                        <span className="text-xs font-bold text-white uppercase">{cycle.type === 'wash' ? 'Lavagem' : 'Secagem'}</span>
                                                    </div>
                                                    <div className="text-xs text-neutral-300 space-y-0.5">
                                                        <div className="flex justify-between">
                                                            <span>Cliente:</span>
                                                            <span className="text-white max-w-[80px] truncate">{cycle.client.split(' ')[0]}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Início:</span>
                                                            <span className="text-white">{format(cycle.start, 'HH:mm')}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Fim:</span>
                                                            <span className="text-white">{format(cycle.end, 'HH:mm')}</span>
                                                        </div>
                                                        <div className="flex justify-between font-medium text-emerald-400 pt-1">
                                                            <span>Valor:</span>
                                                            <span>{cycle.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                        </div>
                                                    </div>
                                                    {/* Arrow */}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-t-[6px] border-t-neutral-700 border-r-[6px] border-r-transparent"></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {timelineData.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-neutral-500 gap-3 border-t border-neutral-800/50">
                            <div className="p-4 bg-neutral-900 rounded-full border border-neutral-800">
                                <Search className="w-6 h-6 opacity-50" />
                            </div>
                            <p>Nenhum ciclo registrado para esta data.</p>
                        </div>
                    )}
                </div>

                {/* Footer Legend */}
                <div className="bg-neutral-900/50 border-t border-neutral-800 p-4 flex gap-6 text-sm justify-end">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-400/30"></div>
                        <span className="text-neutral-400">Lavagem (33.5m)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-amber-500 to-amber-600 border border-amber-400/30"></div>
                        <span className="text-neutral-400">Secagem (49m)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-neutral-400">Máquina em Uso (Hoje)</span>
                    </div>
                </div>

                <style jsx global>{`
                    .group-bar:hover .group-bar-hover\\:opacity-100 {
                        opacity: 1;
                    }
                    .custom-scrollbar::-webkit-scrollbar {
                        height: 8px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: #171717;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #404040;
                        border-radius: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #525252;
                    }
                `}</style>

            </CardContent>
        </Card>
    );
}
