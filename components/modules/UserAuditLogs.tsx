"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Activity, Shield, RefreshCw, User, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  created_at: string;
  user_email: string;
  action: string;
  details: any;
}

export function UserAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching audit logs:", error);
      } else {
        setLogs(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatAction = (action: string) => {
    if (action === 'LOGIN') return <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold border border-blue-500/30">LOGIN</span>;
    if (action === 'SYNC_VMPAY') return <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-bold border border-emerald-500/30">SYNC_VMPAY</span>;
    return <span className="bg-neutral-500/20 text-neutral-400 px-2 py-1 rounded text-xs font-bold border border-neutral-500/30">{action}</span>;
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-6 h-6 text-indigo-500" />
            Auditoria de Sistema
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Registro de acessos e sincronizações dos usuários da plataforma. Acesso restrito ao administrador.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Atualizar
        </button>
      </div>

      <div className="bg-neutral-900/50 border border-white/5 rounded-2xl overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
            <Activity className="w-8 h-8 animate-pulse mb-4" />
            <p>Carregando logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
            <Shield className="w-8 h-8 opacity-20 mb-4" />
            <p>Nenhum registro encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-neutral-900/80">
                  <th className="py-4 px-6 text-xs font-medium text-neutral-400 uppercase tracking-wider">Data / Hora</th>
                  <th className="py-4 px-6 text-xs font-medium text-neutral-400 uppercase tracking-wider">Usuário</th>
                  <th className="py-4 px-6 text-xs font-medium text-neutral-400 uppercase tracking-wider">Ação</th>
                  <th className="py-4 px-6 text-xs font-medium text-neutral-400 uppercase tracking-wider">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-neutral-300">
                        <Calendar className="w-4 h-4 text-neutral-500" />
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <User className="w-4 h-4 text-indigo-400" />
                        {log.user_email || 'Desconhecido'}
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {formatAction(log.action)}
                    </td>
                    <td className="py-4 px-6 text-sm text-neutral-500 max-w-[200px] truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
