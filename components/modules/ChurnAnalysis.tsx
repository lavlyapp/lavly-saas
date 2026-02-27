import { useMemo, useState } from "react";
import { differenceInDays } from "date-fns";
import { Phone, DollarSign, ShoppingBasket, AlertTriangle, Clock, UserX, Download, Lock } from "lucide-react";
import { calculateCrmMetrics, CustomerProfile } from "@/lib/processing/crm";
import { useCustomerContext } from "@/components/context/CustomerContext";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { useAuth } from "@/components/context/AuthContext";


interface ChurnAnalysisProps {
    data: any;
    selectedStore?: string;
}

export function ChurnAnalysis({ data, selectedStore }: ChurnAnalysisProps) {
    const { canAccess } = useSubscription();
    const { role } = useAuth();
    // ... rest of component until return ...

    // ... inside return, before Content Area ...
    {/* Content Area */ }

    const { openCustomerDetails } = useCustomerContext();
    const crmData = useMemo(() => {
        if (!data?.records) return null;
        return calculateCrmMetrics(data.records);
    }, [data?.records]);

    const handleExport = () => {
        if (!crmData) return;

        // Define headers
        const headers = ["Nome", "Telefone", "Risco de Churn", "Dias Ausente", "Ticket Medio", "Total Gasto", "Ultima Visita"];

        // Map data
        const rows = crmData.profiles.map(p => [
            p.name,
            p.phone || "",
            p.churnRisk === 'high' ? 'Alto' : p.churnRisk === 'medium' ? 'Médio' : 'Baixo',
            p.recency,
            p.averageTicket.toFixed(2),
            p.totalSpent.toFixed(2),
            p.lastVisitDate ? p.lastVisitDate.toLocaleDateString('pt-BR') : ""
        ]);

        // Create CSV content
        const csvContent = [
            headers.join(";"),
            ...rows.map(r => r.join(";"))
        ].join("\n");

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `clientes_vmpay_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const { inactive30, inactive60, inactive90 } = useMemo(() => {
        if (!crmData) return { inactive30: [], inactive60: [], inactive90: [] };

        const today = new Date();
        const maxDate = data.records.reduce((max: Date, r: any) => {
            const d = new Date(r.data);
            return d > max ? d : max;
        }, new Date(0));

        const refDate = maxDate.getTime() > 0 ? maxDate : today;

        const i30: CustomerProfile[] = [];
        const i60: CustomerProfile[] = [];
        const i90: CustomerProfile[] = [];

        crmData.profiles.forEach(p => {
            if (p.recency > 90) {
                i90.push(p);
            } else if (p.recency > 60) {
                i60.push(p);
            } else if (p.recency > 30) {
                i30.push(p);
            }
        });

        // Sort by Total Revenue (High Value Churn first)
        const sorter = (a: CustomerProfile, b: CustomerProfile) => b.totalSpent - a.totalSpent;

        return {
            inactive30: i30.sort(sorter),
            inactive60: i60.sort(sorter),
            inactive90: i90.sort(sorter)
        };
    }, [crmData, data?.records]);

    if (!crmData) return null;



    const [activeTab, setActiveTab] = useState<'actions' | 'predictive' | 'legacy'>(role === 'attendant' ? 'predictive' : 'actions');


    // Predictive Groups
    const { highRisk, mediumRisk, lowRisk, quickWins } = useMemo(() => {
        if (!crmData) return { highRisk: [], mediumRisk: [], lowRisk: [], quickWins: [] };

        const h: CustomerProfile[] = [];
        const m: CustomerProfile[] = [];
        const l: CustomerProfile[] = [];
        const wins: CustomerProfile[] = [];

        crmData.profiles.forEach(p => {
            if (p.churnRisk === 'high') h.push(p);
            else if (p.churnRisk === 'medium') m.push(p);
            else l.push(p);

            // Quick Wins Definition: Medium Risk (saindo da rotina) & High Ticket (> R$ 50)
            if (p.churnRisk === 'medium' && p.averageTicket > 50) {
                wins.push(p);
            }
        });

        const sorter = (a: CustomerProfile, b: CustomerProfile) => b.totalSpent - a.totalSpent;

        return {
            highRisk: h.sort(sorter),
            mediumRisk: m.sort(sorter),
            lowRisk: l.sort(sorter),
            quickWins: wins.sort(sorter)
        };
    }, [crmData]);

    if (!crmData) return null;

    const CustomerCard = ({ profile, colorClass, icon: Icon, actionLabel }: { profile: CustomerProfile, colorClass: string, icon: any, actionLabel?: string }) => (
        <div
            onClick={() => openCustomerDetails(profile.name)}
            className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors flex flex-col gap-3 cursor-pointer group"
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
                        <Icon className={`w-4 h-4 ${colorClass}`} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-neutral-200 text-sm group-hover:text-white transition-colors">{profile.name}</h4>
                        {profile.preferredStore && (
                            <div className="text-[10px] text-indigo-400 font-medium truncate max-w-[150px]" title={profile.preferredStore}>
                                📍 {profile.preferredStore}
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{profile.recency} dias sem vir</span>
                        </div>
                    </div>
                </div>
                {profile.phone ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-md border border-green-500/20 text-green-400 text-xs font-mono">
                        <Phone className="w-3 h-3" />
                        <span className="hidden sm:inline">WhatsApp</span>
                    </div>
                ) : (
                    <div className="opacity-50">
                        <Phone className="w-4 h-4 text-neutral-600" />
                    </div>
                )}
            </div>

            {/* Action Suggestion */}
            {actionLabel && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                        {actionLabel}
                    </span>
                </div>
            )}

            {/* Indicators */}
            <div className="grid grid-cols-2 gap-2 mt-auto">
                <div className="bg-neutral-950/50 p-2 rounded border border-neutral-800 text-center">
                    <span className="text-[10px] text-neutral-500 block">Ticket Médio</span>
                    <span className="text-sm font-bold text-neutral-300">
                        {profile.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                </div>
                <div className="bg-neutral-950/50 p-2 rounded border border-neutral-800 text-center">
                    <span className="text-[10px] text-neutral-500 block">Intervalo Médio</span>
                    <span className="text-sm font-bold text-neutral-300">
                        {Math.round(profile.averageInterval || 0)} dias
                    </span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Tabs */}
            {role !== 'attendant' && (
                <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-neutral-800 w-fit">
                    <button
                        onClick={() => setActiveTab('actions')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'actions' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}
                    >
                        🚀 Ações Recomendadas
                    </button>
                    <button
                        onClick={() => setActiveTab('predictive')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'predictive' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}
                    >
                        🔮 Risco Preditivo
                    </button>
                    <button
                        onClick={() => setActiveTab('legacy')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'legacy' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}
                    >
                        📅 Inatividade (30/60/90)
                    </button>
                </div>
            )}


            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {!canAccess('churn_list') ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 bg-neutral-900/20 backdrop-blur-sm rounded-xl border border-neutral-800/50">
                        <div className="p-4 bg-neutral-800 rounded-full shadow-xl">
                            <Lock className="w-12 h-12 text-neutral-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-neutral-200">Recurso Premium</h3>
                            <p className="text-neutral-500 max-w-md mx-auto mt-2">
                                A análise detalhada de risco, listas de clientes e oportunidades de resgate estão disponíveis apenas nos planos <strong>Prata</strong> e <strong>Ouro</strong>.
                            </p>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <div className="px-3 py-1 rounded bg-neutral-800 text-neutral-400 text-xs font-mono uppercase">
                                Você está no plano Bronze
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'actions' && (
                            <div className="h-full flex flex-col">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-white mb-2">Oportunidades de Venda (Win-Back)</h2>
                                    <p className="text-neutral-400">
                                        Clientes de alto valor que estão saindo da rotina usual. Hora de agir antes que virem Churn.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-20">
                                    {quickWins.map((p, i) => (
                                        <CustomerCard
                                            key={i}
                                            profile={p}
                                            colorClass="text-blue-400"
                                            icon={DollarSign}
                                            actionLabel="Oferecer Desconto"
                                        />
                                    ))}
                                    {quickWins.length === 0 && (
                                        <div className="col-span-full py-12 text-center border border-dashed border-neutral-800 rounded-2xl">
                                            <p className="text-neutral-500">Nhuma oportunidade urgente identificada hoje.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'predictive' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
                                {/* Medium Risk */}
                                <div className="flex flex-col h-full bg-neutral-950/30 rounded-2xl border border-neutral-800">
                                    <div className="p-4 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-950/90 backdrop-blur-sm z-10 rounded-t-2xl">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                                            <h3 className="font-semibold text-neutral-200">Saindo da Rotina (Médio)</h3>
                                        </div>
                                        <span className="text-xs font-mono text-neutral-500 bg-neutral-900 px-2 py-1 rounded-md border border-neutral-800">{mediumRisk.length}</span>
                                    </div>
                                    <div className="p-4 space-y-3 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                                        {mediumRisk.map((p, i) => (
                                            <CustomerCard key={i} profile={p} colorClass="text-yellow-500" icon={AlertTriangle} />
                                        ))}
                                    </div>
                                </div>

                                {/* High Risk */}
                                <div className="flex flex-col h-full bg-neutral-950/30 rounded-2xl border border-neutral-800">
                                    <div className="p-4 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-950/90 backdrop-blur-sm z-10 rounded-t-2xl">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                            <h3 className="font-semibold text-neutral-200">Em Risco (Alto)</h3>
                                        </div>
                                        <span className="text-xs font-mono text-neutral-500 bg-neutral-900 px-2 py-1 rounded-md border border-neutral-800">{highRisk.length}</span>
                                    </div>
                                    <div className="p-4 space-y-3 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                                        {highRisk.map((p, i) => (
                                            <CustomerCard key={i} profile={p} colorClass="text-red-500" icon={UserX} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'legacy' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
                                {/* 30-60 Days */}
                                <div className="flex flex-col h-full bg-neutral-950/30 rounded-2xl border border-neutral-800">
                                    <div className="p-4 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-950/90 backdrop-blur-sm z-10 rounded-t-2xl">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-neutral-500"></div>
                                            <h3 className="font-semibold text-neutral-200">Ausentes 30-60 dias</h3>
                                        </div>
                                        <span className="text-xs font-mono text-neutral-500 bg-neutral-900 px-2 py-1 rounded-md border border-neutral-800">{inactive30.length}</span>
                                    </div>
                                    <div className="p-4 space-y-3 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                                        {inactive30.map((p, i) => (
                                            <CustomerCard key={i} profile={p} colorClass="text-neutral-500" icon={Clock} />
                                        ))}
                                    </div>
                                </div>

                                {/* 60-90 Days */}
                                <div className="flex flex-col h-full bg-neutral-950/30 rounded-2xl border border-neutral-800">
                                    <div className="p-4 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-950/90 backdrop-blur-sm z-10 rounded-t-2xl">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-neutral-500"></div>
                                            <h3 className="font-semibold text-neutral-200">Ausentes 60-90 dias</h3>
                                        </div>
                                        <span className="text-xs font-mono text-neutral-500 bg-neutral-900 px-2 py-1 rounded-md border border-neutral-800">{inactive60.length}</span>
                                    </div>
                                    <div className="p-4 space-y-3 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                                        {inactive60.map((p, i) => (
                                            <CustomerCard key={i} profile={p} colorClass="text-neutral-500" icon={Clock} />
                                        ))}
                                    </div>
                                </div>

                                {/* 90+ Days */}
                                <div className="flex flex-col h-full bg-neutral-950/30 rounded-2xl border border-neutral-800">
                                    <div className="p-4 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-950/90 backdrop-blur-sm z-10 rounded-t-2xl">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-neutral-500"></div>
                                            <h3 className="font-semibold text-neutral-200">Perdidos (+90 dias)</h3>
                                        </div>
                                        <span className="text-xs font-mono text-neutral-500 bg-neutral-900 px-2 py-1 rounded-md border border-neutral-800">{inactive90.length}</span>
                                    </div>
                                    <div className="p-4 space-y-3 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                                        {inactive90.map((p, i) => (
                                            <CustomerCard key={i} profile={p} colorClass="text-neutral-500" icon={UserX} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

        </div>

    );
}
