import React, { useState } from 'react';
import { X, Lock, AlertTriangle } from 'lucide-react';

interface AdminPasswordPromptProps {
    isOpen: boolean;
    actionType: 'block' | 'delete';
    targetName: string;
    onClose: () => void;
    onConfirm: (password: string) => Promise<void>;
}

export function AdminPasswordPrompt({ isOpen, actionType, targetName, onClose, onConfirm }: AdminPasswordPromptProps) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!password) {
            setError('A senha é obrigatória.');
            return;
        }

        setLoading(true);
        try {
            await onConfirm(password);
            setPassword('');
        } catch (err: any) {
            setError(err.message || 'Senha incorreta ou erro no servidor.');
        } finally {
            setLoading(false);
        }
    };

    const isDelete = actionType === 'delete';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
            <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
                
                <div className={`p-6 border-b border-neutral-800 flex justify-between items-start ${isDelete ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center border ${isDelete ? 'bg-red-500/20 border-red-500/30 text-red-500' : 'bg-amber-500/20 border-amber-500/30 text-amber-500'}`}>
                            {isDelete ? <AlertTriangle className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {isDelete ? 'Excluir Conta' : 'Bloquear Acesso'}
                            </h2>
                            <p className="text-sm text-neutral-400 mt-1">
                                Para: <span className="font-semibold text-neutral-300">{targetName}</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={loading} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-neutral-400 mb-6">
                        Esta é uma ação de segurança protegida. Você precisa inserir sua <strong className="text-white">senha de Administrador</strong> para confirmar a {isDelete ? 'exclusão' : 'suspensão'}. O histórico será preservado no banco de dados isolado.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Sua Senha Mestra</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                disabled={loading}
                                className="w-full bg-black border border-neutral-800 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 transition-all"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 px-4 py-2 border border-neutral-700 text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`flex-1 px-4 py-2 font-medium text-white rounded-lg transition-colors flex justify-center items-center ${
                                    isDelete ? 'bg-red-600 hover:bg-red-500 disabled:bg-red-800' : 'bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800'
                                }`}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    isDelete ? 'Excluir Definitivo' : 'Bloquear Acesso'
                                )}
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
}
