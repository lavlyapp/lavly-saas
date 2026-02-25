import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { calculateMachineAvailability } from '@/lib/processing/machine-availability';
import { SaleRecord } from '@/lib/processing/etl';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle, TrendingUp, Calendar, Clock } from "lucide-react";

interface MachineAvailabilityProps {
    records: SaleRecord[];
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function MachineAvailability({ records }: MachineAvailabilityProps) {
    const metrics = useMemo(() => calculateMachineAvailability(records), [records]);

    // Format saturation for heatmap color
    const getSaturationColor = (saturation: number) => {
        if (saturation === 0) return 'bg-neutral-100 dark:bg-neutral-900 border-neutral-200';
        if (saturation < 0.3) return 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 text-emerald-700';
        if (saturation < 0.6) return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 text-yellow-700';
        if (saturation < 0.8) return 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 text-orange-700';
        return 'bg-red-100 dark:bg-red-900/30 border-red-200 text-red-700 font-bold';
    };

    const hasData = metrics.totalMachines.wash > 0 || metrics.totalMachines.dry > 0;

    if (!hasData) {
        return (
            <div className="p-8 text-center text-neutral-500">
                <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Dados de disponibilidade não disponíveis.</p>
                <p className="text-sm">É necessário importar o arquivo de Pedidos para análise de máquinas.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">Máquinas Identificadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalMachines.wash + metrics.totalMachines.dry}</div>
                        <p className="text-xs text-neutral-500">
                            {metrics.totalMachines.wash} Lavadoras • {metrics.totalMachines.dry} Secadoras
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">Horários de Pico Extremo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {metrics.peakHours.length > 0 ? metrics.peakHours.length : "0"}
                        </div>
                        <p className="text-xs text-neutral-500">Horários com fila ({'>'}70% ocupação)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">Oportunidade Perdida (Est.)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {metrics.recommendations.length > 0 ? "Alta" : "Baixa"}
                        </div>
                        <p className="text-xs text-neutral-500">Saturação da loja</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recommendations */}
            {metrics.recommendations.length > 0 && (
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertTitle>Insights de Otimização</AlertTitle>
                    <AlertDescription className="space-y-2 mt-2">
                        {metrics.recommendations.map((rec, i) => (
                            <p key={i} className="text-sm text-blue-800 dark:text-blue-300">• {rec}</p>
                        ))}
                    </AlertDescription>
                </Alert>
            )}

            {/* Heatmap */}
            <Card className="overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-neutral-500" />
                        Mapa de Calor: Ocupação da Loja
                    </CardTitle>
                    <CardDescription>
                        Visualização da saturação média das máquinas por dia e hora (Baseado em 33.5min/Lavagem e 49min/Secagem)
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto pb-6">
                    <div className="min-w-[800px]">
                        <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-1 text-center text-xs">
                            {/* Header Row (Hours) */}
                            <div className="h-8 flex items-center justify-end pr-2 font-semibold text-neutral-500">Hora</div>
                            {HOURS.map(h => (
                                <div key={h} className="h-8 flex items-center justify-center text-neutral-400 font-mono">
                                    {h}
                                </div>
                            ))}

                            {/* Rows (Days) */}
                            {WEEKDAYS.map((day, dIndex) => (
                                <React.Fragment key={day}>
                                    <div className="h-10 flex items-center justify-end pr-2 font-medium text-neutral-600 dark:text-neutral-400">
                                        {day}
                                    </div>
                                    {HOURS.map(h => {
                                        const stat = metrics.saturationByHour.find(s => s.day === dIndex && s.hour === h);
                                        const saturation = stat ? stat.saturation : 0;
                                        const count = stat ? stat.count : 0;

                                        return (
                                            <div
                                                key={`${day}-${h}`}
                                                className={`h-10 rounded-sm border flex items-center justify-center text-[10px] transition-all hover:scale-110 cursor-help ${getSaturationColor(saturation)}`}
                                                title={`${day} às ${h}h:\n${(saturation * 100).toFixed(0)}% Ocupação\n(~${count} máq. simultâneas)`}
                                            >
                                                {saturation > 0.1 ? `${(saturation * 100).toFixed(0)}%` : ''}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs text-neutral-500">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded border bg-neutral-100 dark:bg-neutral-900 border-neutral-200"></div>
                            <span>0% (Livre)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded border bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200"></div>
                            <span>1-30% (Baixa)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded border bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200"></div>
                            <span>30-60% (Média)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded border bg-orange-100 dark:bg-orange-900/30 border-orange-200"></div>
                            <span>60-80% (Alta)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded border bg-red-100 dark:bg-red-900/30 border-red-200"></div>
                            <span>{">"}80% (Crítica)</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Peak Hours Detail */}
            {metrics.peakHours.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            Gargalos Identificados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {metrics.peakHours.map((peak, idx) => (
                                <div key={idx} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 font-bold">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                                                {peak.day} às {peak.hour}h
                                            </p>
                                            <p className="text-xs text-neutral-500">
                                                Saturação média de {(peak.saturation * 100).toFixed(0)}%
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            Crítico
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
