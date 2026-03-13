import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Store, Users, DollarSign, Calendar, RefreshCcw, Search } from 'lucide-react';
import { Role } from '../context/AuthContext';

interface ProfileData {
  id: string;
  role: Role;
  assigned_stores: string[];
  max_stores: number;
  subscription_status: string;
  expires_at: string | null;
  email?: string; // We'll try to join or fetch email if possible, else just use ID
}

export function LavlyAdminDashboard() {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch all non-admin profiles (proprietarios e atendentes)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      
      // Attempt to enrich with email if possible via RPC or direct auth match (if admin has rights, though usually requires service role)
      // Since RLS blocks reading auth.users directly from client even for admin, we'll display what we have in profiles.
      // A common pattern is to store email in profiles on creation. Let's see if we have it in profiles eventually.
      
      setProfiles(profilesData || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const totalProprietarios = profiles.filter(p => p.role === 'proprietario').length;
  const totalLojasContratadas = profiles.reduce((acc, p) => acc + (p.assigned_stores?.length || 0), 0);
  
  // Symbologic MRR (Monthly Recurring Revenue): R$ 99 per allocated store
  const mrrEstimado = totalLojasContratadas * 99;

  const filteredProfiles = profiles.filter(p => 
    (p.email || p.id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Lavly SaaS Admin</h2>
          <p className="text-neutral-400">Visão master da plataforma e controle de assinaturas</p>
        </div>
        <button
          onClick={fetchAdminData}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors border border-neutral-700"
        >
          <RefreshCcw className="w-4 h-4" />
          <span className="text-sm font-medium">Atualizar Dados</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-neutral-400 text-sm font-medium">Clientes (Proprietários)</p>
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
              <p className="text-neutral-400 text-sm font-medium">Lojas Ativas</p>
              <h3 className="text-3xl font-bold text-white tracking-tight">{loading ? '-' : totalLojasContratadas}</h3>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-neutral-400 text-sm font-medium">MRR Estimado (SaaS)</p>
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
                      Carregando clientes...
                    </td>
                  </tr>
                ) : filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 text-sm">
                      Nenhum cliente cadastrado ainda.
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map((profile) => {
                    const isVencido = profile.expires_at ? new Date() > new Date(profile.expires_at) : false;

                    return (
                      <tr key={profile.id} className="hover:bg-neutral-800/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 mr-3">
                              <span className="text-indigo-400 font-bold text-xs">
                                {(profile.email || profile.id).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{profile.email || "Sem Email"}</div>
                              <div className="text-xs text-neutral-500 font-mono truncate w-32" title={profile.id}>{profile.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            profile.role === 'proprietario' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                          }`}>
                            {profile.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm text-neutral-300 font-medium">
                            {profile.assigned_stores?.length || 0} / {profile.max_stores}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <span className="text-sm text-amber-500 font-medium tracking-wide">
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
                              {profile.subscription_status === 'active' ? 'Ativo' : 'Pagamento Pendente'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          {profile.expires_at ? (
                             <div className={`font-medium ${isVencido ? 'text-red-500' : 'text-neutral-300'}`}>
                               {new Date(profile.expires_at).toLocaleDateString('pt-BR')}
                               <div className="text-xs text-neutral-500 mt-1">Via Banco de Dados</div>
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
    </div>
  );
}
