import { CloudRain, AlertCircle, TrendingUp, Users, ChevronRight } from "lucide-react";
import { SegmentedCustomer } from "@/lib/processing/crm";

interface WeatherAlertProps {
    isRainy: boolean;
    rainProbability: number;
    expectedAmount: number;
    isPeakDay: boolean;
    audiences: {
        title: string;
        description: string;
        list: SegmentedCustomer[];
    }[];
    onViewAudience: (segment: { title: string, list: SegmentedCustomer[] }) => void;
    storeAddress: string;
}

export function WeatherAlert({ isRainy, rainProbability, expectedAmount, isPeakDay, audiences, onViewAudience, storeAddress }: WeatherAlertProps) {
    if (!isRainy) return null;

    // Time Check
    const currentHour = new Date().getHours() + (new Date().getMinutes() / 60);
    // Don't show before 07:30 AM 
    if (currentHour < 7.5) return null;

    const totalCustomers = audiences.reduce((acc, a) => acc + a.list.length, 0);

    return (
        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-2xl p-6 mb-6 relative overflow-hidden group shadow-lg shadow-blue-900/5">
            {/* Background Icon */}
            <div className="absolute -right-8 -top-8 text-blue-500/10 pointer-events-none transform group-hover:scale-110 transition-transform duration-700">
                <CloudRain className="w-64 h-64" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center justify-between">

                {/* Info Text */}
                <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-500/20 text-blue-400 p-1.5 rounded-lg border border-blue-500/30">
                            <CloudRain className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Oportunidade Chuva! 🌧️</h2>
                    </div>

                    <p className="text-neutral-300 text-sm leading-relaxed">
                        Previsão de <strong className="text-blue-400">{rainProbability}% de chuva</strong> hoje em <span className="text-neutral-400 italic">"{storeAddress}"</span> ({expectedAmount}mm).
                        Dias chuvosos aumentam a demanda por Secagem.
                    </p>

                    <div className="flex items-center gap-3 mt-4 text-xs">
                        <span className={`px-2 py-1 rounded border font-medium ${isPeakDay ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'}`}>
                            {isPeakDay ? '⚠️ Dia de Pico Identificado' : '✅ Dia Tranquilo Identificado'}
                        </span>
                        <span className="text-neutral-500 tracking-wide">
                            {isPeakDay
                                ? 'Focando apenas em resgatar clientes em risco de Churn para não superlotar a loja.'
                                : 'Excelente dia para atrair clientes perto do retorno e clientes inativos.'}
                        </span>
                    </div>
                </div>

                {/* Audiences Actions */}
                <div className="flex flex-col gap-3 min-w-[280px]">
                    <div className="text-xs text-neutral-400 font-bold uppercase tracking-widest mb-1 pl-1">
                        Audiência Sugerida ({totalCustomers})
                    </div>
                    {audiences.map((aud, idx) => (
                        <button
                            key={idx}
                            onClick={() => onViewAudience(aud)}
                            className="bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-700/50 hover:border-blue-500/50 p-3 rounded-xl flex items-center justify-between transition-all group/btn"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-neutral-800 p-2 rounded-lg group-hover/btn:bg-blue-500/20 transition-colors">
                                    <Users className="w-4 h-4 text-neutral-400 group-hover/btn:text-blue-400" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-sm font-bold text-neutral-200">{aud.title}</span>
                                    <span className="block text-[10px] text-neutral-500">{aud.list.length} selecionados</span>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-neutral-600 group-hover/btn:text-blue-400 transform group-hover/btn:translate-x-1 transition-all" />
                        </button>
                    ))}

                    {audiences.length === 0 && (
                        <div className="text-sm p-4 text-center border border-dashed border-neutral-700 rounded-xl text-neutral-500">
                            Nenhum cliente elegível hoje.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
