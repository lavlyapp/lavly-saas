import React, { useState } from 'react';
import { Lock, ShieldAlert, ArrowRight, AlertCircle, RefreshCcw, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/context/AuthContext';

interface OnboardingPasswordProps {
    onSuccess: () => void;
    onDismiss?: () => void;
}

export function OnboardingPassword({ onSuccess, onDismiss }: OnboardingPasswordProps) {
    const { user } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validatePassword = (pass: string) => {
        if (pass.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
        if (!/[A-Z]/.test(pass)) return "A senha deve conter uma letra maiúscula.";
        if (!/[a-z]/.test(pass)) return "A senha deve conter uma letra minúscula.";
        if (!/[0-9]/.test(pass)) return "A senha deve conter pelo menos um número.";
        if (!/[^A-Za-z0-9]/.test(pass)) return "A senha deve conter um símbolo especial.";
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        const validationError = validatePassword(password);
        if (validationError) {
            setError(validationError);
            return;
        }

        if (!user) {
            setError('Sessão expirada. Faça login novamente.');
            return;
        }

        setLoading(true);

        try {
            // Single client-side call: changes password AND clears the flag.
            // supabase.auth.updateUser preserves the active session (unlike admin.updateUserById).
            // Defensive timeout: if the call ever stalls, surface an error instead of an
            // infinite spinner so the user can retry.
            const updatePromise = supabase.auth.updateUser({
                password,
                data: { force_password_change: null }
            });
            const timeoutPromise = new Promise<{ error: { message: string } }>((resolve) =>
                setTimeout(() => resolve({ error: { message: 'Tempo esgotado. Verifique sua conexão e tente novamente.' } }), 15000)
            );

            const { error: updateError } = await Promise.race([updatePromise, timeoutPromise]) as any;

            if (updateError) {
                setError(updateError.message || 'Erro ao atualizar a senha.');
                return;
            }

            onSuccess();
        } catch (err: any) {
            console.error("Password update error:", err);
            setError(err.message || 'Problema de conexão com o servidor. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[400] bg-neutral-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 relative z-10 shadow-2xl">
                
                {onDismiss && (
                    <button 
                        onClick={onDismiss}
                        className="absolute top-6 right-6 p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
                        type="button"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}

                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6">
                    <ShieldAlert className="w-8 h-8 text-red-400" />
                </div>

                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                    Segurança Exigida
                </h1>
                <p className="text-neutral-400 mb-8 leading-relaxed">
                    Como este é o seu <strong className="text-white">primeiro acesso</strong>, você precisa cadastrar uma nova senha pessoal forte antes de acessar o sistema Lavly.
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-red-200">{error}</div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-neutral-400" /> 
                            Nova Senha
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/50 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-3 text-white transition-all shadow-inner"
                            placeholder="Mínimo de 8 caracteres e símbolos"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-neutral-400" /> 
                            Confirme a Nova Senha
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-black/50 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-3 text-white transition-all shadow-inner"
                            placeholder="Digite a mesma senha novamente"
                            required
                        />
                    </div>

                    <div className="pt-4 mt-2">
                        <button
                            type="submit"
                            disabled={loading || !password || !confirmPassword}
                            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-red-600/20"
                        >
                            {loading ? (
                                <RefreshCcw className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Atualizar Senha Segura
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            
            <div className="mt-8 text-center text-xs text-neutral-600 max-w-sm">
                Sua senha é criptografada de ponta-a-ponta e nunca poderá ser lida por nossa equipe de suporte.
            </div>
        </div>
    );
}
