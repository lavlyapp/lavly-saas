import React, { useState } from 'react';
import { X, Calendar, User, Store, Clock, Users, MessageCircle, AlertCircle, ShieldAlert, Ban, Trash2 } from 'lucide-react';
import { AdminPasswordPrompt } from './AdminPasswordPrompt';

interface SubUser {
    id: string;
    email: string | null;
    role: string;
    last_sign_in_at: string | null;
    assigned_stores: string[];
}

interface PayerProfile {
    id: string;
    email: string | null;
    role: string;
    subscription_status: string;
    expires_at: string | null;
    created_at: string | null;
    last_sign_in_at: string | null;
    assigned_stores: string[];
    max_stores: number;
    admin_alias: string | null;
    subUsers: SubUser[];
    status?: string;
}

interface AdminUserDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    payer: PayerProfile | null;
}

export function AdminUserDetailsModal({ isOpen, onClose, payer }: AdminUserDetailsModalProps) {
    const [promptType, setPromptType] = useState<'block' | 'delete' | null>(null);

    if (!isOpen || !payer) return null;

    const handleConfirmSecurityAction = async (password: string) => {
        const response = await fetch('/api/admin/profiles/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetId: payer.id,
                action: promptType,
                password
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Erro ao processar ação');
        }

        // Se sucesso, vamos forçar uma atualização no dashboard pai.
        // O ideal é passar uma prop onUpdate, mas para ser direto podemos recarregar 
        // ou fechar o modal.
        setPromptType(null);
        onClose();
        // Em um projeto real, idealmente o LavlyAdminDashboard tem uma escuta de evento ou passamos "onActionSuccess".
        window.location.reload(); 
    };

    const formatDate = (ds: string | null) => {
        if (!ds) return 'N/A';
        return new Date(ds).toLocaleDateString('pt-BR', { 
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit' 
        });
    };

    const isVencido = payer.expires_at ? new Date() > new Date(payer.expires_at) : false;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-neutral-900 border border-neutral-800 w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
                
                {/* Header */}
                <div className="p-6 border-b border-neutral-800 flex justify-between items-start bg-neutral-900/50">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <span className="text-indigo-400 font-bold text-xl">
                                {(payer.admin_alias || payer.email || payer.id).charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {payer.admin_alias || payer.email || 'Usuário Sem Email'}
                                {payer.admin_alias && <span className="text-xs font-normal text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">Alias</span>}
                            </h2>
                            <p className="text-sm text-neutral-400 font-mono mt-1">{payer.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-8 flex-1">
                    
                    {/* Resumo e Assinatura */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-neutral-400 mb-2">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase">Assinatura</span>
                            </div>
                            <div className="text-sm text-white font-medium mb-1">
                                {isVencido ? (
                                    <span className="text-red-500">Vencida</span>
                                ) : payer.subscription_status === 'active' ? (
                                    <span className="text-emerald-400">Ativa (Gold)</span>
                                ) : (
                                    <span className="text-amber-500">Pendente</span>
                                )}
                            </div>
                            <div className="text-xs text-neutral-500">
                                Expira: {payer.expires_at ? new Date(payer.expires_at).toLocaleDateString('pt-BR') : 'Vitalício'}
                            </div>
                        </div>

                        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-neutral-400 mb-2">
                                <Store className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase">Lojas Físicas</span>
                            </div>
                            <div className="text-lg text-white font-bold mb-1">
                                {payer.assigned_stores?.length || 0} / {payer.max_stores || 0}
                            </div>
                            <div className="text-xs text-neutral-500">
                                Configurações Vinculadas
                            </div>
                        </div>

                        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-neutral-400 mb-2">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase">Frequência</span>
                            </div>
                            <div className="text-sm text-white font-medium mb-1">
                                Último Login
                            </div>
                            <div className="text-xs text-neutral-500">
                                {formatDate(payer.last_sign_in_at)}
                            </div>
                        </div>

                        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-neutral-400 mb-2">
                                <MessageCircle className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase">Engajamento (WA)</span>
                            </div>
                            <div className="text-lg text-white font-bold mb-1">
                                0 <span className="text-xs text-neutral-500 font-normal">msgs</span>
                            </div>
                            <div className="text-[10px] text-neutral-600 leading-tight">
                                (Integração de contagem em desenvolvimento)
                            </div>
                        </div>
                    </div>

                    {/* Lojas Vinculadas List */}
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <Store className="w-5 h-5 text-emerald-500" />
                            Lojas/Licenças Vinculadas
                        </h3>
                        {payer.assigned_stores && payer.assigned_stores.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {Array.from(new Set(payer.assigned_stores.map(storeId => 
                                    storeId.toLowerCase().includes('bezerra de menezes') ? 'Lavateria Cascavel' : storeId
                                ))).map(storeId => (
                                    <div key={storeId} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium rounded-lg">
                                        {storeId}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-neutral-500 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Nenhuma loja vinculada a este pagador.
                            </div>
                        )}
                    </div>

                    {/* Sub-usuarios (Atendentes/Sócios) */}
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-blue-500" />
                            Sub-usuários Vinculados ({payer.subUsers?.length || 0})
                        </h3>
                        
                        <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
                            {payer.subUsers && payer.subUsers.length > 0 ? (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-neutral-900 border-b border-neutral-800">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-neutral-400">Email</th>
                                            <th className="px-4 py-3 font-medium text-neutral-400">Nível</th>
                                            <th className="px-4 py-3 font-medium text-neutral-400">Acesso</th>
                                            <th className="px-4 py-3 font-medium text-neutral-400 text-right">Último Login</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800/50">
                                        {payer.subUsers.map(sub => (
                                            <tr key={sub.id} className="hover:bg-neutral-900/50 transition-colors">
                                                <td className="px-4 py-3 text-white font-medium">{sub.email || 'Sem Email'}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded-full border border-neutral-700">
                                                        {sub.role.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-neutral-400">
                                                    {Array.from(new Set((sub.assigned_stores || []).map(s => 
                                                        s.toLowerCase().includes('bezerra de menezes') ? 'Lavateria Cascavel' : s
                                                    ))).length} lojas
                                                </td>
                                                <td className="px-4 py-3 text-neutral-500 text-right text-xs">
                                                    {formatDate(sub.last_sign_in_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-6 text-center text-sm text-neutral-500">
                                    Nenhum atendente ou sócio vinculado a esta conta principal.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Security Frame */}
                    {payer.status !== 'deleted' ? (
                        <div className="mt-8 pt-6 border-t border-neutral-800">
                            <h3 className="text-sm font-bold text-neutral-400 flex items-center gap-2 uppercase tracking-wide mb-4">
                                <ShieldAlert className="w-4 h-4 text-red-500" />
                                Zona de Perigo (Ações do Administrador)
                            </h3>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setPromptType('block')}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Ban className="w-4 h-4" /> Suspender Acesso (Bloquear)
                                </button>
                                <button 
                                    onClick={() => setPromptType('delete')}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" /> Excluir Conta e Sub-usuários
                                </button>
                            </div>
                            <p className="text-xs text-neutral-600 mt-2">Ao realizar estas ações, o histórico de Vendas permanecerá preservado no banco.</p>
                        </div>
                    ) : (
                        <div className="mt-8 pt-6 border-t border-red-500/20">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-4">
                                <Trash2 className="w-6 h-6 text-red-500 shrink-0" />
                                <div>
                                    <h3 className="text-red-400 font-bold">Esta conta foi excluída permanentemente.</h3>
                                    <p className="text-sm text-red-400/80 mt-1">
                                        Os registros e sub-usuários foram preservados como histórico, mas o acesso autenticado a esta conta foi banido.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            <AdminPasswordPrompt 
                isOpen={!!promptType}
                actionType={promptType as 'block' | 'delete'}
                targetName={payer.email || payer.admin_alias || payer.id}
                onClose={() => setPromptType(null)}
                onConfirm={handleConfirmSecurityAction}
            />
        </div>
    );
}
