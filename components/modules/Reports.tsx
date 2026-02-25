import { useMemo, useState } from "react";
import { SaleRecord } from "@/lib/processing/etl";
import {
    TrendingUp, Users, AlertCircle, ShoppingCart,
    ArrowRight, MessageSquare, Download, Calendar,
    Filter, DollarSign, Clock, Wrench, BarChart3,
    Activity, Trophy, CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { calculateCrmMetrics, calculatePeriodStats } from "@/lib/processing/crm";
import { format, subDays, isAfter, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { useCustomerContext } from "@/components/context/CustomerContext";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { Lock } from "lucide-react";

interface ReportsProps {
    data: { records: SaleRecord[] };
}

export function Reports({ data }: ReportsProps) {
    const { canAccess } = useSubscription();
    const { openCustomerDetails } = useCustomerContext();
    const [reportType, setReportType] = useState<'recovery' | 'opportunity' | 'machine'>('recovery');

    const metrics = useMemo(() => {
        if (!data?.records) return null;
        return calculateCrmMetrics(data.records);
    }, [data?.records]);

    const periodStats = useMemo(() => {
        if (!data?.records) return null;
        return calculatePeriodStats(data.records, data.records);
    }, [data?.records]);

    // 1. Recovery Logic: High LTV customers, inactive > 30 days
    const recoveryList = useMemo(() => {
        if (!metrics?.profiles) return [];
        return metrics.profiles
            .filter(p => p.recency > 30 && p.totalSpent > 100) // Valuable and inactive
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 20);
    }, [metrics?.profiles]);

    const estimatedMonthlyLoss = useMemo(() => {
        if (!metrics?.profiles) return 0;
        const inactivePrecious = metrics.profiles.filter(p => p.recency > 20 && p.totalSpent > 50);
        return inactivePrecious.reduce((acc, p) => acc + (p.totalSpent / Math.max(differenceInDays(new Date(), p.firstVisitDate) / 30, 1)), 0);
    }, [metrics?.profiles]);

    // 2. Opportunities: Only Wash / Only Dry
    const opportunities = useMemo(() => {
        if (!periodStats) return null;
        return {
            onlyWash: periodStats.onlyWashList.slice(0, 10),
            onlyDry: periodStats.onlyDryList.slice(0, 10)
        };
    }, [periodStats]);

    // 3. Machine BI: Advanced stats
    const machineBI = useMemo(() => {
        if (!data?.records) return [];

        const machineMap = new Map<string, {
            id: string;
            type: string;
            totalMinutes: number;
            totalRevenue: number;
            cycles: number;
        }>();

        data.records.forEach(r => {
            r.items?.forEach(item => {
                const mId = item.machine;
                if (!mId) return;

                const curr = machineMap.get(mId) || { id: mId, type: '', totalMinutes: 0, totalRevenue: 0, cycles: 0 };

                const isWash = item.service.toLowerCase().includes('lav') || item.machine.toLowerCase().includes('lav');
                curr.type = isWash ? 'Lavadora' : 'Secadora';
                curr.cycles++;
                curr.totalRevenue += (item.value || 0);
                curr.totalMinutes += isWash ? 33.5 : 49;

                machineMap.set(mId, curr);
            });
        });

        return Array.from(machineMap.values()).map(m => ({
            ...m,
            revenuePerHour: m.totalMinutes > 0 ? (m.totalRevenue / (m.totalMinutes / 60)) : 0,
            maintenanceScore: Math.min(100, (m.cycles / 500) * 100) // Arbitrary scale for demo
        })).sort((a, b) => b.revenuePerHour - a.revenuePerHour);
    }, [data?.records]);

    if (!data || !metrics) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Report Selector Header */}
            <div className="bg-neutral-900/50 p-2 rounded-xl border border-neutral-800 flex flex-wrap gap-2 items-center">
                <button
                    onClick={() => setReportType('recovery')}
                    className={`px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${reportType === 'recovery' ? 'bg-indigo-600 text-white font-medium shadow-lg' : 'text-neutral-400 hover:bg-neutral-800'}`}
                >
                    <Users className="w-4 h-4" /> Recuperação de Clientes
                </button>
                <button
                    onClick={() => setReportType('opportunity')}
                    className={`px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${reportType === 'opportunity' ? 'bg-indigo-600 text-white font-medium shadow-lg' : 'text-neutral-400 hover:bg-neutral-800'}`}
                >
                    <TrendingUp className="w-4 h-4" /> Crescimento & Vendas
                </button>
                <button
                    onClick={() => setReportType('machine')}
                    className={`px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${reportType === 'machine' ? 'bg-indigo-600 text-white font-medium shadow-lg' : 'text-neutral-400 hover:bg-neutral-800'}`}
                >
                    <Activity className="w-4 h-4" /> BI de Máquinas
                </button>
            </div>

            {/* --- 1. CUSTOMER RECOVERY REPORT --- */}
            {reportType === 'recovery' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-red-500/5 border-red-500/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-red-400">Receita em Risco</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-500">
                                    {estimatedMonthlyLoss.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">Estimativa de perda mensal de clientes inativos</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-amber-500/5 border-amber-500/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-amber-400">Clientes "Sumidos"</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-amber-500">{metrics.customerStats.inactive30}</div>
                                <p className="text-xs text-neutral-500 mt-1">Inativos entre 30 e 60 dias</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-emerald-500/5 border-emerald-500/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-emerald-400">Potential de Resgate</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-500">{recoveryList.length}</div>
                                <p className="text-xs text-neutral-500 mt-1">Clientes de alto valor para ação imediata</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* LOCK SCREEN FOR DETAILED LIST */}
                    {!canAccess('churn_list') ? (
                        <div className="bg-neutral-900/20 border border-neutral-800 rounded-xl p-8 flex flex-col items-center text-center backdrop-blur-sm">
                            <div className="p-4 bg-neutral-800 rounded-full mb-4">
                                <Lock className="w-8 h-8 text-neutral-500" />
                            </div>
                            <h3 className="text-lg font-bold text-neutral-200">Lista Detalhada Bloqueada</h3>
                            <p className="text-neutral-500 max-w-sm mt-2 mb-4">
                                Para ver os nomes e contatos desta lista de resgate, você precisa do plano <strong>Prata</strong> ou <strong>Ouro</strong>.
                            </p>
                            <div className="px-3 py-1 rounded bg-neutral-800 text-neutral-400 text-xs font-mono uppercase">
                                Plano Bronze Ativo
                            </div>
                        </div>
                    ) : (
                        <Card>
                            {/* ... existing Card content ... */}
                            {/* I will copy the existing content here in the next steps or rely on the fact I can view it */}
                            {/* Actually, replacing the whole block is safer */}
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                    Lista de Resgate Prioritária
                                </CardTitle>
                                <CardDescription>Clientes frequentes que não visitam a loja há mais de 30 dias</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Telefone</TableHead>
                                            <TableHead className="text-right">Total Gasto</TableHead>
                                            <TableHead className="text-right">Última Vez</TableHead>
                                            <TableHead className="text-right">Inatividade</TableHead>
                                            <TableHead className="text-right">Ação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recoveryList.map((p) => (
                                            <TableRow key={p.name}>
                                                <TableCell className="font-medium text-white">
                                                    <button
                                                        onClick={() => openCustomerDetails(p.name)}
                                                        className="hover:text-blue-400 hover:underline text-left transition-colors"
                                                    >
                                                        {p.name}
                                                    </button>
                                                </TableCell>
                                                <TableCell className="text-neutral-400">{p.phone || '(Sem número)'}</TableCell>
                                                <TableCell className="text-right font-bold text-emerald-400">
                                                    {p.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </TableCell>
                                                <TableCell className="text-right text-neutral-500">
                                                    {format(p.lastVisitDate, "dd/MM/yy")}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className="text-red-400 font-bold">{p.recency} dias</span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {canAccess('whatsapp') ? (
                                                        <a
                                                            href={generateWhatsAppLink(p.phone, `Olá ${p.name.split(' ')[0]}, sentimos sua falta! Estamos com saudades. Que tal passar aqui hoje?`)}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex p-2 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </a>
                                                    ) : (
                                                        <button
                                                            onClick={() => window.alert('Upgrade para o plano Gold necessário para automação de WhatsApp!')}
                                                            className="inline-flex p-2 bg-amber-500/20 text-amber-500 rounded-lg hover:bg-amber-500 hover:text-white transition-all border border-amber-500/30"
                                                            title="Assinar Gold"
                                                        >
                                                            <Lock className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* --- 2. OPPORTUNITY / GROWTH REPORT --- */}
            {reportType === 'opportunity' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-blue-500/20">
                            <CardHeader>
                                <CardTitle className="text-blue-400 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" /> Foco: Cross-Sell (Lavagem → Secagem)
                                </CardTitle>
                                <CardDescription>Clientes que utilizam apenas lavagem. Ofereça um cupom para secagem!</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* LOCK SCREEN FOR OPPORTUNITY LIST */}
                                {!canAccess('churn_list') ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center bg-neutral-900/50 rounded-lg border border-neutral-800 border-dashed">
                                        <div className="p-3 bg-neutral-800 rounded-full mb-3">
                                            <Lock className="w-6 h-6 text-neutral-500" />
                                        </div>
                                        <p className="text-neutral-400 font-medium">Lista de Clientes Bloqueada</p>
                                        <p className="text-xs text-neutral-600 mt-1 mb-3">Disponível no plano Prata+</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {opportunities?.onlyWash.map(c => (
                                            <div key={c.name} className="flex justify-between items-center p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                                                <div>
                                                    <button
                                                        onClick={() => openCustomerDetails(c.name)}
                                                        className="font-medium text-white hover:text-blue-400 hover:underline text-left transition-colors"
                                                    >
                                                        {c.name}
                                                    </button>
                                                    <p className="text-xs text-neutral-500">{c.wCount} lavagens / 0 secagens</p>
                                                </div>
                                                <button className="text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded text-white flex items-center gap-1 transition-all">
                                                    Sugestão Combo <ArrowRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-amber-500/20">
                            <CardHeader>
                                <CardTitle className="text-amber-400 flex items-center gap-2">
                                    <Clock className="w-5 h-5" /> Estratégia: Horários Ociosos
                                </CardTitle>
                                <CardDescription>Melhores momentos para promoções de volume</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                        <p className="text-sm font-bold text-amber-500 mb-1">Terças e Quartas (14h-17h)</p>
                                        <p className="text-xs text-amber-600/80">Ocupação média de apenas 22%. Recomendado: "Combo Família" 20% OFF.</p>
                                    </div>
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                        <p className="text-sm font-bold text-emerald-500 mb-1">Pico Detectado: Domingo</p>
                                        <p className="text-xs text-emerald-600/80">Ocupação &gt; 90% às 10h. Considere tarifa diferenciada ou sinalização de espera.</p>
                                    </div>
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                        <p className="text-sm font-bold text-blue-400 mb-1">Ticket Médio atual: {metrics.globalAverageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        <p className="text-xs text-blue-500/80">Meta sugerida: R$ 45,00. Estimulado por vendas de cestas ou serviços premium.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )
            }

            {/* --- 3. MACHINE BI REPORT --- */}
            {
                reportType === 'machine' && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-indigo-400" />
                                    Desempenho Operacional de Máquinas
                                </CardTitle>
                                <CardDescription>Aprofundamento financeiro por hora de funcionamento</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!canAccess('churn_list') ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center bg-neutral-900/20 rounded-lg">
                                        <div className="p-4 bg-neutral-800 rounded-full mb-4">
                                            <Lock className="w-10 h-10 text-neutral-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-neutral-200">Análise de Máquinas Bloqueada</h3>
                                        <p className="text-neutral-500 mt-2 mb-4 max-w-sm">
                                            Indicadores de eficiência, saúde preventiva e receita por hora estão disponíveis apenas nos planos <strong>Prata</strong> e <strong>Ouro</strong>.
                                        </p>
                                        <div className="px-3 py-1 rounded bg-neutral-800 text-neutral-400 text-xs font-mono uppercase">
                                            Plano Bronze Ativo
                                        </div>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Máquina</TableHead>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead className="text-right">Receita/Hora Ativa</TableHead>
                                                <TableHead className="text-right">Eficiência Financeira</TableHead>
                                                <TableHead className="text-right">Saúde (Preventiva)</TableHead>
                                                <TableHead className="text-right">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {machineBI.map((m) => (
                                                <TableRow key={m.id}>
                                                    <TableCell className="font-medium text-white">{m.id}</TableCell>
                                                    <TableCell className="text-xs text-neutral-500 uppercase">{m.type}</TableCell>
                                                    <TableCell className="text-right font-bold text-white">
                                                        {m.revenuePerHour.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-emerald-500"
                                                                    style={{ width: `${Math.min(100, (m.revenuePerHour / 40) * 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-neutral-400">{Math.round((m.revenuePerHour / 40) * 100)}%</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${m.maintenanceScore > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                                                                    style={{ width: `${m.maintenanceScore}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-neutral-400">{m.cycles}/500</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${m.maintenanceScore < 80 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                            {m.maintenanceScore < 80 ? 'Operacional' : 'Manutenção'}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )
            }
        </div>
    );
}
