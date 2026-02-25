"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Shield, Clock, User, Activity, AlertCircle } from "lucide-react";

export function ActivityLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('activity_logs')
            .select(`
                *,
                profiles (
                    email,
                    role
                )
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error("Error fetching logs:", error);
        } else {
            setLogs(data || []);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    Log de Auditoria do Sistema
                </h3>
                <button
                    onClick={fetchLogs}
                    className="text-xs text-neutral-400 hover:text-white transition-colors"
                >
                    Atualizar
                </button>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-neutral-800 bg-neutral-950/50">
                            <th className="p-4 font-bold text-neutral-400">Data/Hora</th>
                            <th className="p-4 font-bold text-neutral-400">Usuário</th>
                            <th className="p-4 font-bold text-neutral-400">Ação</th>
                            <th className="p-4 font-bold text-neutral-400">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-neutral-500 italic">
                                    Nenhum log encontrado.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-neutral-800/30 transition-colors">
                                    <td className="p-4 text-neutral-300">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3 text-neutral-500" />
                                            {format(new Date(log.created_at), "dd/MM HH:mm")}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{log.profiles?.email || 'Sistema'}</span>
                                            <span className="text-[10px] text-neutral-500 uppercase font-black">{log.profiles?.role || 'Service'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${log.action === 'SYNC_VMPAY' ? 'bg-emerald-500/10 text-emerald-400' :
                                            log.action === 'UPLOAD_FILE' ? 'bg-blue-500/10 text-blue-400' :
                                                log.action === 'LOGIN' ? 'bg-indigo-500/10 text-indigo-400' :
                                                    'bg-neutral-800 text-neutral-400'
                                            }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="p-4 text-neutral-400 text-xs">
                                        {JSON.stringify(log.details)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
