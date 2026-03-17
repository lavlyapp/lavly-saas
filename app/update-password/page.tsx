"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Verify session existance when landing from email
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                // Se a pessoa entrou direto aqui sem link válido ou o link expirou
                setError("Link de recuperação inválido ou expirado. Por favor, solicite um novo.");
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        
        if (password.length < 8) {
            setError("A senha deve ter pelo menos 8 caracteres.");
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError("As senhas não coincidem.");
            setIsLoading(false);
            return;
        }

        const { error: updateError } = await supabase.auth.updateUser({ password });

        if (updateError) {
            setError(updateError.message || "Erro ao atualizar a senha.");
            setIsLoading(false);
        } else {
            setSuccessMsg("Senha atualizada com sucesso! Redirecionando para o painel...");
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px]" />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="inline-flex items-center justify-center p-3 bg-emerald-500/20 rounded-2xl mb-4 border border-emerald-500/30">
                        <Lock className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                        Criar Nova Senha
                    </h1>
                    <p className="text-neutral-400 text-sm">Digite uma senha forte e segura (mín. 8 caracteres).</p>
                </div>

                <div className="bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 p-8 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 ml-1">
                                Nova Senha
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-neutral-600 group-focus-within:text-indigo-400 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full bg-neutral-950/50 border border-neutral-800 text-white rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-neutral-700"
                                    placeholder="••••••••"
                                    required
                                    disabled={isLoading || !!successMsg}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 ml-1">
                                Confirmar Nova Senha
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <CheckCircle2 className="h-5 w-5 text-neutral-600 group-focus-within:text-emerald-400 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full bg-neutral-950/50 border border-neutral-800 text-white rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-neutral-700"
                                    placeholder="••••••••"
                                    required
                                    disabled={isLoading || !!successMsg}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-400 text-xs font-medium text-center animate-shake bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center justify-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="text-emerald-400 text-xs font-medium text-center animate-in fade-in slide-in-from-top-2 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                                {successMsg}
                            </div>
                        )}

                        {!successMsg && (
                            <button
                                type="submit"
                                disabled={isLoading || error.includes("expirado")}
                                className={`w-full group flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg ${
                                    isLoading || error.includes("expirado")
                                        ? 'bg-emerald-600/50 text-white/50 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5'
                                }`}
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Salvar Senha e Entrar
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
