import React, { useState } from 'react';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';

interface AdminCreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AdminCreateUserModal({ isOpen, onClose, onSuccess }: AdminCreateUserModalProps) {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        plan: 'ouro',
        maxStores: 1,
        apiKey: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const res = await fetch('/api/admin/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setSuccessMsg(data.message);
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            } else {
                setError(data.error || 'Erro ao criar usuário');
            }
        } catch (err: any) {
            setError(err.message || 'Erro inesperado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300">
                <div className="flex items-center justify-between p-6 border-b border-neutral-800 bg-neutral-950/50">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                        <UserPlus className="w-5 h-5 text-indigo-400" />
                        Nova Conta de Cliente
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-neutral-400 hover:bg-neutral-800 hover:text-white rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[80vh]">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div className="text-sm text-red-200">{error}</div>
                        </div>
                    )}

                    {successMsg && (
                        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                            <CheckIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="text-sm text-emerald-200">{successMsg}</div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">E-mail do Proprietário</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-black border border-neutral-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg p-3 text-white transition-all"
                                placeholder="ex: efigenia@lavanderia.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">Senha Inicial</label>
                            <input
                                type="text"
                                required
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="w-full bg-black border border-neutral-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg p-3 text-white transition-all"
                                placeholder="ex: Lavly123!"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-300">Plano</label>
                                <select
                                    value={formData.plan}
                                    onChange={e => setFormData({ ...formData, plan: e.target.value })}
                                    className="w-full bg-black border border-neutral-800 focus:border-indigo-500 rounded-lg p-3 text-white transition-all outline-none"
                                >
                                    <option value="bronze">Bronze (Básico)</option>
                                    <option value="prata">Prata (Intermediário)</option>
                                    <option value="ouro">Ouro (Completo)</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-300">Limite de Lojas</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.maxStores}
                                    onChange={e => setFormData({ ...formData, maxStores: parseInt(e.target.value) || 1 })}
                                    className="w-full bg-black border border-neutral-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg p-3 text-white transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <label className="text-sm font-medium text-neutral-300">Chave de Integração (VMPay API Key)</label>
                            <textarea
                                value={formData.apiKey}
                                onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                                className="w-full h-24 bg-black border border-neutral-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg p-3 text-white text-xs font-mono transition-all resize-none"
                                placeholder="Deixe em branco para forçar o cliente a configurar no primeiro acesso..."
                            />
                            <p className="text-xs text-neutral-500">
                                Se preenchido, o sistema importará as lojas; se vazio, a área do cliente ficará bloqueada até ele cadastrar sua chave.
                            </p>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Criar Múltiplas Lojas
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function CheckIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}
