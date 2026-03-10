"use client";

import { useState } from "react";
import { Loader2, CheckCircle, AlertCircle, Store } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoreNeedCnpj {
    name: string;
}

interface OnboardingCnpjProps {
    stores: StoreNeedCnpj[];
    onComplete: () => void;
}

export function OnboardingCnpj({ stores, onComplete }: OnboardingCnpjProps) {
    const [cnapejs, setCnapejs] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleCnpjChange = (storeName: string, value: string) => {
        // Mask CNPJ: 00.000.000/0000-00
        let v = value.replace(/\D/g, "");
        if (v.length > 14) v = v.substring(0, 14);

        v = v.replace(/^(\d{2})(\d)/, "$1.$2");
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
        v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
        v = v.replace(/(\d{4})(\d)/, "$1-$2");

        setCnapejs(prev => ({ ...prev, [storeName]: v }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        const missing = stores.filter(s => {
            const val = cnapejs[s.name]?.replace(/\D/g, "");
            return !val || val.length !== 14;
        });

        if (missing.length > 0) {
            setError(`Por favor, preencha corretamente o CNPJ de todas as lojas.`);
            return;
        }

        setIsLoading(true);

        const storesData = stores.map(s => ({
            name: s.name,
            cnpj: cnapejs[s.name]
        }));

        try {
            // Include jwt token from supabase auth if needed by your api design.
            // Next.js app router generally passes the cookies. We'll use the supabase hook to get the session.
            const { supabase } = await import('@/lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();

            const res = await fetch("/api/stores/update-cnpj", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": session ? `Bearer ${session.access_token}` : ""
                },
                body: JSON.stringify({ storesData })
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || "Erro ao salvar os CNPJs.");
            }

            setSuccessMessage("Redirecionando para o seu Dashboard...");
            setTimeout(() => {
                onComplete();
            }, 2000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center z-50 p-6">
            <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center justify-center w-16 h-16 bg-neutral-800 rounded-2xl border border-neutral-700 mx-auto mb-6 shadow-xl">
                        <Store className="w-8 h-8 text-emerald-400" />
                    </div>

                    <h1 className="text-3xl font-bold text-center text-white mb-3">Bem-vindo ao Lavly!</h1>
                    <p className="text-center text-neutral-400 max-w-lg mx-auto mb-10">
                        Sua conta foi vinculada com sucesso. Para garantirmos a melhor experiência e precisão nos cruzamentos de dados, precisamos que informe o CNPJ de sua(s) loja(s).
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-black/50 border border-neutral-800 rounded-2xl p-6 space-y-5">
                            {stores.map((store, i) => (
                                <div key={i} className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        Loja: <span className="text-white">{store.name}</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="00.000.000/0000-00"
                                        value={cnapejs[store.name] || ""}
                                        onChange={(e) => handleCnpjChange(store.name, e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono tracking-widest"
                                        disabled={isLoading || !!successMessage}
                                        maxLength={18}
                                    />
                                </div>
                            ))}
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-in slide-in-from-bottom-2">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl flex items-center justify-center gap-3 text-sm font-medium animate-in slide-in-from-bottom-2">
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                {successMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !!successMessage}
                            className={cn(
                                "w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl transition-all flex items-center justify-center gap-2",
                                isLoading || successMessage
                                    ? "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700"
                                    : "bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/30 border border-emerald-500/50"
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Validando e Salvando...
                                </>
                            ) : successMessage ? (
                                "Tudo Certo!"
                            ) : (
                                "Acessar Meu Painel"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
