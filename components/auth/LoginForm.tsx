"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Lock, User, ArrowRight, Sparkles, WashingMachine as Machine } from "lucide-react";

export function LoginForm() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const { error: loginError } = await login(email, password);

        if (loginError) {
            setError(loginError.message || "Credenciais inválidas.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px]" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo Area */}
                <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="inline-flex items-center justify-center p-3 bg-indigo-600/20 rounded-2xl mb-4 border border-indigo-500/30">
                        <Machine className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                        Lavly<span className="text-indigo-500">.</span>
                    </h1>
                    <p className="text-neutral-400 text-sm">Dashboard de Alta Performance para Lavanderias</p>
                </div>

                {/* Glassmorphism Card */}
                <div className="bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 p-8 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 ml-1">
                                Email
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-neutral-600 group-focus-within:text-indigo-400 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full bg-neutral-950/50 border border-neutral-800 text-white rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-neutral-700"
                                    placeholder="seu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 ml-1">
                                Senha
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
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-400 text-xs font-medium text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full group flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg ${isLoading
                                ? 'bg-indigo-600/50 text-white/50 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5'
                                }`}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Acessar Dashboard
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-neutral-800/50 text-center">
                        <div className="flex items-center justify-center gap-2 text-neutral-500 text-xs">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            Ambiente Restrito e Seguro
                        </div>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="mt-8 flex justify-center gap-6">
                    <button className="text-[10px] text-neutral-600 hover:text-neutral-400 uppercase tracking-widest font-bold transition-colors">
                        Termos de Uso
                    </button>
                    <button className="text-[10px] text-neutral-600 hover:text-neutral-400 uppercase tracking-widest font-bold transition-colors">
                        Suporte Técnico
                    </button>
                </div>
            </div>
        </div>
    );
}
