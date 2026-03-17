"use client";

import { useState } from "react";
import Link from 'next/link';
import { useAuth } from "../context/AuthContext";
import { Lock, User, ArrowRight, Sparkles, WashingMachine as Machine } from "lucide-react";

export function LoginForm() {
    const { login, loginWithGoogle } = useAuth();
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
            setError(loginError.message || "Email ou senha incorretos.");
            setIsLoading(false);
        } else {
            // Sucesso: auth state change redirectará via middleware/efeito ou força reload seguro
            window.location.href = '/dashboard';
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
                                Email de Acesso
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
                                    disabled={isLoading}
                                />
                            </div>
                            <p className="text-xs text-neutral-500 mt-2 ml-1">Ambiente protegido e criptografado.</p>
                        </div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                                    Senha
                                </label>
                                <Link href="/forgot-password" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                                    Esqueci minha senha
                                </Link>
                            </div>
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
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-400 text-xs font-medium text-center animate-shake bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
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
                                    Acessar Painel
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Separator */}
                    <div className="mt-6 flex items-center gap-4">
                        <div className="flex-1 h-px bg-neutral-800"></div>
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">OU</span>
                        <div className="flex-1 h-px bg-neutral-800"></div>
                    </div>

                    {/* Google OAuth Button */}
                    <button
                        type="button"
                        onClick={async () => {
                            setIsLoading(true);
                            await loginWithGoogle();
                        }}
                        disabled={isLoading}
                        className="mt-6 w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white text-neutral-900 font-bold text-sm hover:bg-neutral-100 transition-all hover:-translate-y-0.5"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            <path fill="none" d="M1 1h22v22H1z" />
                        </svg>
                        Continuar com Google
                    </button>

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
