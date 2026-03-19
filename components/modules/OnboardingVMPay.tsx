import React, { useState } from 'react';
import { Key, ShieldCheck, ArrowRight, AlertCircle, RefreshCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/context/AuthContext';

interface OnboardingVMPayProps {
    onSuccess: (apiKey: string) => void;
}

export function OnboardingVMPay({ onSuccess }: OnboardingVMPayProps) {
    const { user } = useAuth();
    const [apiKey, setApiKey] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!termsAccepted) {
            setError('Você precisa aceitar os termos de uso para continuar.');
            return;
        }

        if (apiKey.trim().length < 20) {
            setError('A API Key parece ser inválida. Verifique o tamanho da chave fornecida.');
            return;
        }

        if (!user) {
            setError('Sessão expirada. Faça login novamente.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/onboarding/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: apiKey.trim(), userId: user.id }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setError(data.error || 'Erro ao validar sua chave e buscar lojas.');
            } else {
                onSuccess(apiKey.trim());
            }
        } catch (err: any) {
            setError('Problema de conexão com o servidor. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-neutral-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-xl w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 relative z-10 shadow-2xl">
                
                <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-6">
                    <ShieldCheck className="w-8 h-8 text-indigo-400" />
                </div>

                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                    Bem-vindo(a) ao Lavly
                </h1>
                <p className="text-neutral-400 mb-8 leading-relaxed">
                    Para habilitar o painel de análise e relatórios inteligentes, você precisa validar sua integração com a plataforma <span className="text-white font-medium">VM Pay</span> e concordar com nossos termos de prestação de serviço (SaaS Lavly).
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-red-200">{error}</div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                            <Key className="w-4 h-4 text-indigo-400" /> 
                            Sua VMPay API Key Original
                        </label>
                        <p className="text-xs text-neutral-500 mb-3">
                            Peça esta chave ao suporte da VMPay. Ela garante que o Lavly tenha acesso apenas de leitura (Read-Only) aos seus registros, mantendo seu sistema blindado.
                        </p>
                        <textarea
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full h-28 bg-black/50 border border-neutral-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-4 text-white text-sm font-mono transition-all resize-none shadow-inner leading-relaxed"
                            placeholder="eyJ... Cole sua chave aqui"
                            required
                        />
                    </div>

                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-start">
                                <input
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="peer appearance-none w-5 h-5 border-2 border-neutral-600 rounded bg-black checked:bg-indigo-600 checked:border-transparent transition-all mt-0.5 cursor-pointer"
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <div className="text-sm text-neutral-300 leading-snug group-hover:text-neutral-200 transition-colors">
                                Eu declaro que li e concordo com a <a href="#" className="text-indigo-400 font-medium hover:underline">Política de Privacidade</a> e <a href="#" className="text-indigo-400 font-medium hover:underline">Termos de Uso</a> (SaaS) do Lavly, e autorizo a análise computacional metrificada baseada nos meus registros comerciais providos pela API v1 da VMPay.
                            </div>
                        </label>
                    </div>

                    <div className="pt-4 border-t border-neutral-800">
                        <button
                            type="submit"
                            disabled={loading || !termsAccepted || !apiKey}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                        >
                            {loading ? (
                                <RefreshCcw className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Validar Integração e Entrar
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            
            <div className="mt-8 text-center text-xs text-neutral-600 max-w-md">
                Você precisará configurar isso apenas uma vez. Após a verificação, você terá acesso imediato aos gráficos e algoritmos preventivos.
            </div>
        </div>
    );
}
