import React, { useState } from 'react';
import { Power, Thermometer, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface TuyaConfig {
    clientId: string;
    clientSecret: string;
    sceneOnId: string;
    sceneOffId: string;
}

interface TuyaClimateWidgetProps {
    storeName: string;
    config: TuyaConfig | null; // null if not configured
}

export function TuyaClimateWidget({ storeName, config }: TuyaClimateWidgetProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const isConfigured = config && config.clientId && config.sceneOnId;

    const executeScene = async (action: 'ON' | 'OFF') => {
        if (!config || !isConfigured) return;

        setIsLoading(true);
        setStatus('idle');
        setMessage(`Contatando ${action === 'ON' ? 'Ligar' : 'Desligar'} via Tuya Cloud...`);

        try {
            const targetSceneId = action === 'ON' ? config.sceneOnId : config.sceneOffId;

            // the existing API expects: action=command, deviceId=[the sceneId], isScene=true, cmd=[ON/OFF]
            // headers x-tuya-id and x-tuya-secret
            const res = await fetch(`/api/tuya?action=command&deviceId=${targetSceneId}&isScene=true&cmd=${action}`, {
                method: 'POST',
                headers: {
                    'x-tuya-id': config.clientId,
                    'x-tuya-secret': config.clientSecret
                }
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setStatus('success');
                setMessage(`Ar Condicionado ${action === 'ON' ? 'LIGADO' : 'DESLIGADO'} com sucesso!`);
            } else {
                throw new Error(data.error || 'Nuvem da Tuya rejeitou o comando.');
            }
        } catch (e: any) {
            setStatus('error');
            setMessage(e.message || 'Falha de comunicação com Nuvens da Tuya.');
        } finally {
            setIsLoading(false);
            // reset status visual after 3 seconds
            setTimeout(() => {
                setStatus('idle');
            }, 4000);
        }
    };

    if (!isConfigured) return null; // Hide completely if not configured for this store

    return (
        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/20 rounded-2xl p-6 shadow-xl mb-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -left-10 -top-10 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>

            <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0 border border-blue-400/30">
                    <Thermometer className="w-7 h-7 text-white" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Controle Climático Inteligente</h3>
                    <p className="text-blue-200/70 text-sm mt-0.5">Gerenciamento remoto de Ar-Condicionado ({storeName})</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto relative z-10">
                {/* Status Indicator */}
                {status !== 'idle' && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium animate-in slide-in-from-right-2
                        ${status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}
                    `}>
                        {status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {message}
                    </div>
                )}
                
                {status === 'idle' && isLoading && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-blue-500/10 border-blue-500/30 text-blue-400 text-sm font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {message}
                    </div>
                )}

                <button
                    onClick={() => executeScene('ON')}
                    disabled={isLoading}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                >
                    <Power className="w-5 h-5" />
                    LIGAR AR
                </button>
                <button
                    onClick={() => executeScene('OFF')}
                    disabled={isLoading}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700 hover:border-red-500/50 text-neutral-300 hover:text-red-400 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    DESLIGAR
                </button>
            </div>
        </div>
    );
}
