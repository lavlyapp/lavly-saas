import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Store, Users, DollarSign, Calendar, RefreshCcw, Search, Edit2, Check, X, Trash2 } from 'lucide-react';
import { Role } from '../context/AuthContext';
import { AdminUserDetailsModal } from './AdminUserDetailsModal';
import { AdminCreateUserModal } from './AdminCreateUserModal';

// Update ProfileData to match the new API structure
interface ProfileData {
  id: string;
  role: Role;
  assigned_stores: string[];
  max_stores: number;
  subscription_status: string;
  expires_at: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  admin_alias: string | null;
  email: string | null;
  subUsers: any[];
  dominant_location?: string | null;
}

export function LavlyAdminDashboard() {
  const [payers, setPayers] = useState<ProfileData[]>([]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [totalPhysicalStoresCount, setTotalPhysicalStoresCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [selectedPayer, setSelectedPayer] = useState<ProfileData | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Inline edit alias state
  const [editingAliasId, setEditingAliasId] = useState<string | null>(null);
  const [tempAlias, setTempAlias] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/profiles', {
          headers: {
              'Authorization': 'Bearer ADMIN_REQUEST' // Dummy token since backend relies on Service Role
          }
      });
      const data = await response.json();

      if (data.success) {
          setPayers(data.data.payers || []);
          setTotalUsersCount(data.data.totalUsers || 0);
          setTotalPhysicalStoresCount(data.data.totalPhysicalStores || 0);
      } else {
          console.error('Failed to fetch admin data:', data.error);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleSaveAlias = async (id: string) => {
      try {
          const res = await fetch('/api/admin/profiles', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, admin_alias: tempAlias })
          });
          const data = await res.json();
          if (data.success) {
              setPayers(payers.map(p => p.id === id ? { ...p, admin_alias: tempAlias } : p));
              setEditingAliasId(null);
          }
      } catch (e) {
          console.error("Error saving alias", e);
      }
  };

  const handleDeleteUser = async (id: string, email: string | null) => {
      if (!window.confirm(`Tem certeza que deseja EXCLUIR DEFINITIVAMENTE o usuário ${email || id}? Esta ação não pode ser desfeita.`)) {
          return;
      }

      setLoading(true);
      try {
          const res = await fetch(`/api/admin/profiles?id=${id}`, {
              method: 'DELETE',
          });
          const data = await res.json();
          if (data.success) {
              setPayers(payers.filter(p => p.id !== id));
          } else {
              alert('Erro ao excluir usuário: ' + data.error);
          }
      } catch (e) {
          console.error("Error deleting user", e);
          alert('Erro de conexão ao excluir usuário.');
      } finally {
          setLoading(false);
      }
  };

  const totalProprietarios = payers.length;
  // Symbologic MRR (Monthly Recurring Revenue): R$ 99 per allocated MAX_STORES constraint globally, or just a fixed estimate
  const mrrEstimado = payers.reduce((acc, p) => acc + (p.max_stores || 0), 0) * 99;

  const filteredProfiles = payers.filter(p => 
    (p.email || p.id).toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.admin_alias || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Lavly SaaS Admin</h2>
          <p className="text-neutral-400">Visão master da plataforma e controle de assinaturas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
          >
            <span className="text-sm">Nova Conta</span>
          </button>
          <button
            onClick={fetchAdminData}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors border border-neutral-700"
          >
            <RefreshCcw className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Atualizar Dados</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-neutral-400 text-sm font-medium">Pagantes Ativos</p>
              <h3 className="text-3xl font-bold text-white tracking-tight">{loading ? '-' : totalProprietarios}</h3>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-neutral-400 text-sm font-medium">Lojas Físicas Operando</p>
              <h3 className="text-3xl font-bold text-white tracking-tight">{loading ? '-' : totalPhysicalStoresCount}</h3>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-neutral-400 text-sm font-medium">Usuários Totais</p>
              <h3 className="text-3xl font-bold text-white tracking-tight">{loading ? '-' : totalUsersCount}</h3>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-lg">
              <RefreshCcw className="w-6 h-6" />
            </div>
            <div>
              <p className="text-neutral-400 text-sm font-medium">MRR Estimado</p>
              <h3 className="text-3xl font-bold text-white tracking-tight">
                {loading ? '-' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mrrEstimado)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Assinantes */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-neutral-900/50 backdrop-blur-xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Controle de Assinaturas
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black border border-neutral-800 text-white text-sm rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block pl-9 p-2 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-neutral-800">
              <thead className="bg-neutral-900/80">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">ID / Email do Perfil</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">Nível</th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider">Lojas Ativas</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">Plano</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">Status Assinatura</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider">Validade (expires_at)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50 bg-black/20">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 text-sm">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                      Carregando pagantes...
                    </td>
                  </tr>
                ) : filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 text-sm">
                      Nenhum pagante ou alias encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map((profile) => {
                    const isVencido = profile.expires_at ? new Date() > new Date(profile.expires_at) : false;

                    return (
                      <tr key={profile.id} className="hover:bg-neutral-800/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shrink-0 cursor-pointer" onClick={() => setSelectedPayer(profile)}>
                              <span className="text-indigo-400 font-bold text-sm">
                                {(profile.admin_alias || profile.email || profile.id).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                                {editingAliasId === profile.id ? (
                                    <div className="flex items-center gap-1 mt-1">
                                        <input
                                            type="text"
                                            autoFocus
                                            className="bg-neutral-950 border border-indigo-500 text-white text-xs px-2 py-1 rounded w-32 outline-none"
                                            value={tempAlias}
                                            onChange={(e) => setTempAlias(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveAlias(profile.id)}
                                        />
                                        <button onClick={() => handleSaveAlias(profile.id)} className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"><Check className="w-3 h-3" /></button>
                                        <button onClick={() => setEditingAliasId(null)} className="p-1 text-neutral-500 hover:bg-neutral-800 rounded"><X className="w-3 h-3" /></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group/alias">
                                        <span className="text-sm font-bold text-white cursor-pointer hover:underline" onClick={() => setSelectedPayer(profile)}>
                                            {profile.admin_alias ? profile.admin_alias : 'Sem Apelido'}
                                        </span>
                                        <button onClick={() => { setEditingAliasId(profile.id); setTempAlias(profile.admin_alias || ''); }} className="opacity-0 group-hover/alias:opacity-100 text-neutral-500 hover:text-indigo-400 transition-opacity">
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => handleDeleteUser(profile.id, profile.email)} title="Excluir Usuário" className="opacity-0 group-hover/alias:opacity-100 text-neutral-500 hover:text-red-500 transition-opacity ml-1">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                              <div className="text-xs text-neutral-500 font-mono" title="Email da Conta">{profile.email || "Sem Email (Inválido)"}</div>
                              {profile.dominant_location && (
                                  <div className="text-[10px] text-indigo-300 mt-0.5 font-medium flex items-center gap-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                      {profile.dominant_location}
                                  </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-neutral-300 font-medium">{profile.subUsers?.length || 0} Sub-usuários</span>
                            <button onClick={() => setSelectedPayer(profile)} className="text-[10px] text-indigo-400 hover:underline text-left mt-0.5">Ver Lista</button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center">
                              <span className="text-sm text-neutral-300 font-bold">
                                {profile.assigned_stores?.length || 0} de {profile.max_stores}
                              </span>
                              <span className="text-[10px] text-neutral-500">Lojas config.</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-lg border border-amber-500/20">
                            GOLD
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isVencido ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                              Bloqueado (Vencido)
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {profile.subscription_status === 'active' ? 'Ativo' : 'Pendente'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          {profile.expires_at ? (
                             <div className={`font-medium ${isVencido ? 'text-red-500' : 'text-neutral-300'}`}>
                               {new Date(profile.expires_at).toLocaleDateString('pt-BR')}
                               <div className="text-xs text-neutral-500 mt-1">Renovação Mensal</div>
                             </div>
                          ) : (
                            <span className="text-emerald-500 text-xs font-semibold">Acesso Vitalício</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AdminUserDetailsModal 
        isOpen={!!selectedPayer}
        onClose={() => setSelectedPayer(null)}
        payer={selectedPayer}
      />

      <AdminCreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchAdminData();
        }}
      />
    </div>
  );
}
