import { SaleRecord } from "@/lib/processing/etl";
import { X, Phone, ShoppingBasket, DollarSign, Clock, Calendar, Sunrise, Sun, Sunset, Moon, MapPin, Activity, Sparkles, User, Mail, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CustomerProfile } from "@/lib/processing/crm";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { useSubscription } from "@/components/context/SubscriptionContext";

interface CustomerDetailsProps {
    isOpen: boolean;
    onClose: () => void;
    profile: CustomerProfile | null;
    periodRecords?: SaleRecord[]; // Optional: for period-specific stats
}

export function CustomerDetails({ isOpen, onClose, profile, periodRecords }: CustomerDetailsProps) {
    const { canAccess } = useSubscription();

    if (!isOpen || !profile) return null;

    // Logic to calculate stats (Period vs Lifetime)
    let displayWash = profile.totalWashes ?? 0; // Default to Lifetime
    let displayDry = profile.totalDries ?? 0;
    let displayTotal = profile.totalCycles ?? 0;
    let isPeriodContext = false;

    if (periodRecords && periodRecords.length > 0) {
        // ... (keep existing logic) ...
        const customerRecords = periodRecords.filter(r => r.cliente.trim().toUpperCase() === profile.name);

        if (customerRecords.length > 0) {
            isPeriodContext = true;
            let pWash = 0;
            let pDry = 0;

            customerRecords.forEach(r => {
                if (r.items && r.items.length > 0) {
                    r.items.forEach(item => {
                        const svc = (item.service || '').toLowerCase();
                        const machine = (item.machine || '').toLowerCase();
                        if (svc.includes('lav') || machine.includes('lav')) pWash++;
                        if (svc.includes('sec') || machine.includes('sec')) pDry++;
                    });
                } else {
                    const prod = (r.produto || '').toLowerCase();
                    if (prod.includes('lav') || prod.includes('ozonio') || prod.includes('agua')) pWash++;
                    if (prod.includes('sec')) pDry++;
                }
            });

            // By default, showing lifetime baskets is safer than recalculating without the full heuristics from crm.ts.
            // We use the global `profile.totalWashes` and `profile.totalDries` directly.
            displayWash = profile.totalWashes ?? 0;
            displayDry = profile.totalDries ?? 0;
            displayTotal = displayWash + displayDry;
        }
    }

    const getShiftIcon = (shift: string) => {
        switch (shift) {
            case 'Manhã': return <Sunrise className="w-4 h-4 text-orange-400" />;
            case 'Tarde': return <Sun className="w-4 h-4 text-yellow-500" />;
            case 'Noite': return <Sunset className="w-4 h-4 text-purple-500" />;
            case 'Madrugada': return <Moon className="w-4 h-4 text-blue-400" />;
            default: return <Clock className="w-4 h-4 text-neutral-400" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Slide-over Panel */}
            <div className="relative w-full max-w-md h-full bg-neutral-900 border-l border-neutral-800 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-neutral-800 flex justify-between items-start bg-neutral-900 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-white leading-tight flex items-center gap-2">
                            {profile.name}
                            {profile.gender === 'M' && <span className="text-blue-400 text-xs bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">M</span>}
                            {profile.gender === 'F' && <span className="text-pink-400 text-xs bg-pink-400/10 px-1.5 py-0.5 rounded border border-pink-400/20">F</span>}
                        </h2>

                        <div className="flex flex-col gap-1 mt-2">
                            {profile.preferredStore && (
                                <div className="flex items-center gap-1.5 text-indigo-400 text-sm font-medium mb-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span className="truncate max-w-[280px]" title={profile.preferredStore}>{profile.preferredStore}</span>
                                </div>
                            )}

                            {/* Phone & WhatsApp */}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-neutral-400 text-sm">
                                    <Phone className="w-3 h-3" />
                                    <span className="font-mono">{profile.phone || 'Sem telefone'}</span>
                                </div>
                                {profile.phone && (
                                    canAccess('whatsapp') ? (
                                        <a
                                            href={generateWhatsAppLink(
                                                profile.phone,
                                                `Olá ${profile.name.split(' ')[0]}, tudo bem? Vimos aqui na Lavanderia que...`
                                            )}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1.5 px-2 py-0.5 bg-green-600/20 hover:bg-green-600 text-green-500 hover:text-white text-[10px] font-bold rounded-full transition-all"
                                        >
                                            WhatsApp
                                        </a>
                                    ) : (
                                        <button
                                            onClick={() => window.alert('Upgrade para o plano Gold necessário para automação de WhatsApp!')}
                                            className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500 text-amber-500 hover:text-white text-[10px] font-bold rounded-full transition-all border border-amber-500/30"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            Gold
                                        </button>
                                    )
                                )}
                            </div>

                            {/* Email */}
                            {profile.email && (
                                <div className="flex items-center gap-2 text-neutral-500 text-xs">
                                    <Mail className="w-3 h-3" />
                                    <span>{profile.email}</span>
                                </div>
                            )}

                            {/* CPF & Registration Date */}
                            <div className="flex items-center gap-3 text-neutral-500 text-xs">
                                {profile.cpf && (
                                    <div className="flex items-center gap-1.5" title="CPF">
                                        <CreditCard className="w-3 h-3" />
                                        <span className="font-mono">{profile.cpf}</span>
                                    </div>
                                )}
                                {profile.registrationDate && (
                                    <div className="flex items-center gap-1.5" title="Data de Cadastro">
                                        <Calendar className="w-3 h-3" />
                                        <span>Cadastrado em {format(profile.registrationDate, 'dd/MM/yyyy')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Stats Grid */}
                    <section>
                        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">
                            Métricas Principais {isPeriodContext ? '(Período Selecionado)' : '(Vitalício)'}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                                <span className="text-xs text-neutral-400 block mb-1">Total Gasto (Vitalício)</span>
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <DollarSign className="w-5 h-5" />
                                    <span className="text-xl font-mono font-bold">
                                        {profile.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                                    </span>
                                </div>
                            </div>

                            {/* Cestos Card Breakdown */}
                            <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50 col-span-2 md:col-span-1">
                                <span className="text-xs text-neutral-400 block mb-1">Cestos (Vitalício)</span>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <span className="text-lg font-mono font-bold text-blue-400">{displayWash}</span>
                                        <span className="text-[10px] text-neutral-500 uppercase">Lav</span>
                                    </div>
                                    <div className="w-px h-4 bg-neutral-700"></div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-lg font-mono font-bold text-amber-500">{displayDry}</span>
                                        <span className="text-[10px] text-neutral-500 uppercase">Sec</span>
                                    </div>
                                    <div className="w-px h-4 bg-neutral-700"></div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-lg font-mono font-bold text-white">{displayTotal}</span>
                                        <span className="text-[10px] text-neutral-500 uppercase">Tot</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Last 5 Visits */}
                    <section>
                        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Últimas 5 Visitas</h3>
                        <div className="bg-neutral-800/30 rounded-xl border border-neutral-800 overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-neutral-900 text-neutral-500 uppercase font-bold">
                                    <tr>
                                        <th className="px-4 py-3">Data</th>
                                        <th className="px-4 py-3">Turno</th>
                                        <th className="px-4 py-3 text-center" title="Lavagens / Secagens">Uso</th>
                                        <th className="px-4 py-3 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800 text-neutral-300">
                                    {profile.lastVisits?.map((visit, i) => (
                                        <tr key={i} className="hover:bg-neutral-800/50">
                                            <td className="px-4 py-3 font-mono">
                                                {format(visit.date, "dd/MM/yy")}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {getShiftIcon(visit.shift)}
                                                    {visit.shift}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-blue-400 font-bold">{visit.washCount}L</span>
                                                    <span className="text-neutral-600">|</span>
                                                    <span className="text-amber-500 font-bold">{visit.dryCount}S</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-400">
                                                R$ {visit.total.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!profile.lastVisits || profile.lastVisits.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-6 text-center text-neutral-500 italic">
                                                Nenhum registro recente.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Top 3 Slots */}
                    <section>
                        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Horários Preferidos (Top 3)</h3>
                        <div className="space-y-3">
                            {profile.topSlots.length === 0 && (
                                <p className="text-neutral-600 text-sm italic">Sem dados suficientes no período.</p>
                            )}
                            {profile.topSlots.map((slot, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-neutral-800/30 p-3 rounded-lg border border-neutral-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <span className="text-neutral-200 font-medium block">{slot.day}</span>
                                            <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                                                {getShiftIcon(slot.shift)}
                                                <span>{slot.shift}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono bg-neutral-900 px-2 py-1 rounded text-neutral-500">
                                        {slot.count} idas
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Total Lifetime */}
                    <section className="pt-6 border-t border-neutral-800">
                        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
                            Total Geral
                        </h3>
                        <div className="flex items-center justify-between text-sm text-neutral-400 mb-2">
                            <span>Primeira Visita</span>
                            <span className="text-neutral-300 font-mono">
                                {profile.firstVisitDate ? format(profile.firstVisitDate, 'dd/MM/yyyy') : '-'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-neutral-400 mb-2">
                            <span>Ticket Médio (Histórico)</span>
                            <span className="text-neutral-300 font-mono">
                                {profile.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-neutral-400 mb-2">
                            <span>Total Gasto (Lifetime)</span>
                            <span className="text-neutral-300 font-mono">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profile.totalSpent)}
                            </span>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
