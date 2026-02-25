import { PeriodStats, SegmentedCustomer } from "@/lib/processing/crm";
import { Users, UserPlus, UserMinus, UserCheck, Clock, TrendingUp, AlertCircle, Droplets, Wind, Sparkles, X, Phone, User, Lock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { generateWhatsAppLink, sendWhatsAppMessage } from "@/lib/whatsapp";
import { useCustomerContext } from "@/components/context/CustomerContext";
import { useSubscription } from "@/components/context/SubscriptionContext";

interface CrmCustomerBlockProps {
    periodStats: PeriodStats;
    totalCustomers?: number;
    onSelectSegment?: (segment: { title: string, list: SegmentedCustomer[] }) => void;
}

export function CrmCustomerBlock({ periodStats, totalCustomers, onSelectSegment }: CrmCustomerBlockProps) {
    const { canAccess } = useSubscription();
    const { openCustomerDetails } = useCustomerContext();
    const [selectedSegment, setSelectedSegment] = useState<{ title: string; list: SegmentedCustomer[] } | null>(null);
    const [sending, setSending] = useState<string | null>(null);

    const handleSend = async (phone: string, name: string) => {
        if (!phone) return;
        setSending(phone);

        // Custom message based on segment context could be added here
        const message = `Olá ${name.split(' ')[0]}! Vimos que você lavou suas roupas na Lavly. Que tal finalizar com uma secagem perfeita? Temos um cupom especial para você! 🧺✨`;

        const result = await sendWhatsAppMessage(phone, message);
        setSending(null);

        if (result.success) {
            // Optional: visual feedback
        } else {
            alert(`Erro ao enviar: ${result.error}`);
        }
    };

    if (!periodStats) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <Users className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-white">Bloco Clientes — "Quem Veio Neste Período?"</h2>
            </div>

            {/* Grid de Indicadores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                {/* 1. Clientes Ativos (No Período) */}
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-neutral-400 uppercase font-bold">Ativos (No Período)</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{periodStats.activeCustomers}</p>
                    <p className="text-[10px] text-neutral-500">Únicos que visitaram</p>
                </div>

                {/* 2. Novos Reais + Reativados */}
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <UserPlus className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-neutral-400 uppercase font-bold">Novos / Retorno</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{periodStats.newCustomers}</p>
                    <p className="text-[10px] text-neutral-500">Nunca vieram ou &gt; 180 dias</p>
                </div>

                {/* 3. Ticket Médio (Visita) */}
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-neutral-400 uppercase font-bold">Ticket Médio</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {periodStats.avgTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>

                {/* 4. LTV (Gasto por Cliente no Período) */}
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-neutral-400 uppercase font-bold">LTV (Período)</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {periodStats.avgLtv.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>

            </div>

            {/* Segmentação de Uso (Lavagem vs Secagem) */}
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        Comportamento de Uso (Clientes Únicos)
                    </h3>
                    <span className="text-[10px] text-neutral-600">Clique nos cards para ver a lista</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                    {/* Só Lavou */}
                    <div
                        onClick={() => setSelectedSegment({ title: "Só Lavaram 💦", list: periodStats.onlyWashList })}
                        className="bg-neutral-950/50 p-4 rounded-lg flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 border border-transparent transition-all cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Droplets className="w-12 h-12" />
                        </div>
                        <div>
                            <p className="text-xs text-white uppercase font-bold mb-1 group-hover:text-blue-400 transition-colors">Só Lavou</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-blue-400">{periodStats.onlyWashCount}</span>
                                <span className="text-xs text-neutral-500">
                                    {(periodStats.activeCustomers > 0 ? (periodStats.onlyWashCount / periodStats.activeCustomers * 100) : 0).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <div className="w-full bg-neutral-800 h-1 mt-3 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full" style={{ width: `${periodStats.activeCustomers > 0 ? (periodStats.onlyWashCount / periodStats.activeCustomers * 100) : 0}%` }}></div>
                        </div>
                        <p className="text-[10px] text-emerald-500 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ver Lista ({periodStats.onlyWashList.length})</p>
                    </div>

                    {/* Só Secou */}
                    <div
                        onClick={() => setSelectedSegment({ title: "Só Secaram 🌬️", list: periodStats.onlyDryList })}
                        className="bg-neutral-950/50 p-4 rounded-lg flex flex-col justify-between relative overflow-hidden group hover:border-orange-500/30 border border-transparent transition-all cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Wind className="w-12 h-12" />
                        </div>
                        <div>
                            <p className="text-xs text-white uppercase font-bold mb-1 group-hover:text-orange-400 transition-colors">Só Secou</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-orange-400">{periodStats.onlyDryCount}</span>
                                <span className="text-xs text-neutral-500">
                                    {(periodStats.activeCustomers > 0 ? (periodStats.onlyDryCount / periodStats.activeCustomers * 100) : 0).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <div className="w-full bg-neutral-800 h-1 mt-3 rounded-full overflow-hidden">
                            <div className="bg-orange-500 h-full" style={{ width: `${periodStats.activeCustomers > 0 ? (periodStats.onlyDryCount / periodStats.activeCustomers * 100) : 0}%` }}></div>
                        </div>
                        <p className="text-[10px] text-emerald-500 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ver Lista ({periodStats.onlyDryList.length})</p>
                    </div>

                    {/* Lavou e Secou */}
                    <div
                        onClick={() => setSelectedSegment({ title: "Lavaram e Secaram 🦄", list: periodStats.washAndDryList })}
                        className="bg-neutral-950/50 p-4 rounded-lg flex flex-col justify-between relative overflow-hidden group hover:border-purple-500/30 border border-transparent transition-all cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Sparkles className="w-12 h-12" />
                        </div>
                        <div>
                            <p className="text-xs text-white uppercase font-bold mb-1 group-hover:text-purple-400 transition-colors">Combo (Lav+Sec)</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-purple-400">{periodStats.washAndDryCount}</span>
                                <span className="text-xs text-neutral-500">
                                    {(periodStats.activeCustomers > 0 ? (periodStats.washAndDryCount / periodStats.activeCustomers * 100) : 0).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <div className="w-full bg-neutral-800 h-1 mt-3 rounded-full overflow-hidden">
                            <div className="bg-purple-500 h-full" style={{ width: `${periodStats.activeCustomers > 0 ? (periodStats.washAndDryCount / periodStats.activeCustomers * 100) : 0}%` }}></div>
                        </div>
                        <p className="text-[10px] text-neutral-600 mt-2">Desses, <span className="text-purple-300 font-bold">{periodStats.washAndDryBalancedCount}</span> fazem o ciclo completo exato.</p>
                        <p className="text-[10px] text-emerald-500 mt-0.5 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ver Lista ({periodStats.washAndDryList.length})</p>
                    </div>

                    {/* Indeterminado / Erro de Dados */}
                    {periodStats.unclassifiedList && periodStats.unclassifiedList.length > 0 && (
                        <div
                            onClick={() => setSelectedSegment({ title: "Indeterminado / Sem Dados ⚠️", list: periodStats.unclassifiedList })}
                            className="bg-neutral-950/50 p-4 rounded-lg flex flex-col justify-between relative overflow-hidden group hover:border-red-500/30 border border-transparent transition-all cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <AlertCircle className="w-12 h-12" />
                            </div>
                            <div>
                                <p className="text-xs text-neutral-400 uppercase font-bold mb-1 group-hover:text-red-400 transition-colors">Outros / Produtos</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-neutral-500">{periodStats.unclassifiedList.length}</span>
                                    <span className="text-xs text-neutral-600">
                                        {(periodStats.activeCustomers > 0 ? (periodStats.unclassifiedList.length / periodStats.activeCustomers * 100) : 0).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-full bg-neutral-800 h-1 mt-3 rounded-full overflow-hidden">
                                <div className="bg-neutral-600 h-full" style={{ width: `${periodStats.activeCustomers > 0 ? (periodStats.unclassifiedList.length / periodStats.activeCustomers * 100) : 0}%` }}></div>
                            </div>
                            <p className="text-[10px] text-red-500 mt-2 font-medium">Possível erro de vínculo.</p>
                        </div>
                    )}

                </div>
            </div>

            {/* Modal de Detalhes da Lista */}
            {selectedSegment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-neutral-900 border border-neutral-800 w-full max-w-4xl h-[80vh] rounded-2xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50 rounded-t-2xl">
                            <div>
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    {selectedSegment.title}
                                </h3>
                                <p className="text-neutral-400 text-sm mt-1">
                                    {selectedSegment.list.length} clientes encontrados neste segmento
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedSegment(null)}
                                className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content Table */}
                        <div className="flex-1 overflow-auto p-0">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-neutral-950 text-neutral-400 uppercase font-medium sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4 text-center">Lavagens</th>
                                        <th className="px-6 py-4 text-center">Secagens</th>
                                        <th className="px-6 py-4 text-right">Gasto (Período)</th>
                                        <th className="px-6 py-4 text-left">Info (Debug)</th>
                                        <th className="px-6 py-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800 text-neutral-300">
                                    {selectedSegment.list.map((c, i) => (
                                        <tr key={i} className="hover:bg-neutral-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => openCustomerDetails(c.name)}
                                                    className="font-medium text-white hover:text-blue-400 hover:underline text-left transition-colors"
                                                >
                                                    {c.name}
                                                </button>
                                                <div className="text-xs text-neutral-500 font-mono mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                    <div className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        {c.phone || "Sem telefone"}
                                                    </div>
                                                    {c.preferredStore && (
                                                        <div className="flex items-center gap-1 text-indigo-400/80" title={c.preferredStore}>
                                                            📍 <span className="truncate max-w-[120px]">{c.preferredStore}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${c.wCount > 0 ? 'bg-blue-500/10 text-blue-400' : 'text-neutral-600'}`}>
                                                    {c.wCount} lav
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${c.dCount > 0 ? 'bg-orange-500/10 text-orange-400' : 'text-neutral-600'}`}>
                                                    {c.dCount} sec
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono">
                                                {c.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="px-6 py-4 text-left text-xs text-neutral-500 font-mono break-all">
                                                {c.debugInfo || "-"}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {c.phone ? (
                                                    canAccess('whatsapp') ? (
                                                        <button
                                                            onClick={() => handleSend(c.phone, c.name)}
                                                            disabled={sending === c.phone}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-lg transition-all ${sending === c.phone
                                                                ? 'bg-neutral-700 cursor-wait'
                                                                : 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20'
                                                                }`}
                                                        >
                                                            {sending === c.phone ? (
                                                                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                            ) : (
                                                                <Phone className="w-3 h-3" />
                                                            )}
                                                            {sending === c.phone ? 'Enviando...' : 'Enviar Cupom'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => window.alert('Upgrade para o plano Gold necessário para automação de WhatsApp!')}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-500 hover:text-white text-xs font-bold rounded-lg transition-colors border border-amber-500/30"
                                                        >
                                                            <Sparkles className="w-3 h-3" />
                                                            Assinar Gold
                                                        </button>
                                                    )
                                                ) : (
                                                    <span className="text-neutral-600 text-xs italic">Sem contato</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {selectedSegment.list.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-neutral-500">
                                                Nenhum cliente neste segmento para o período selecionado.
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
import { DollarSign } from "lucide-react";
