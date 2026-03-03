import { useSettings } from "@/components/context/SettingsContext";
import { Settings, MapPin, Key, Save, CheckCircle, Store, Clock, RefreshCw, Trash2, Plus, User, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logger";
import { useAuth } from "@/components/context/AuthContext";

export interface StoreCredential {
    id?: string;
    name: string;
    cnpj: string;
    api_key: string;
    open_time: string;
    close_time: string;
    is_active: boolean;

    // Novos campos de endereço
    cep?: string;
    address?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
}

export function SettingsPage() {
    const { user } = useAuth();
    const { storeSettings, setStoreAddress, automationSettings, setAutomationSettings } = useSettings();

    // VMPay Account State
    const [vmpayUser, setVmpayUser] = useState("");
    const [vmpayPass, setVmpayPass] = useState("");
    const [showPass, setShowPass] = useState(false);

    // Store Management State
    const [stores, setStores] = useState<StoreCredential[]>([]);
    const [isLoading, setIsLoading] = useState(true);



    const [localAutomation, setLocalAutomation] = useState(automationSettings);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        setIsLoading(true);
        if (user) {
            // 1. Fetch Profile (VMPay Master Account)
            const { data: profile } = await supabase
                .from('profiles')
                .select('vmpay_user, vmpay_password')
                .eq('id', user.id)
                .single();

            if (profile) {
                setVmpayUser(profile.vmpay_user || "");
                setVmpayPass(profile.vmpay_password || "");
            }

            // 2. Fetch Stores
            const { data: storeData } = await supabase
                .from('stores')
                .select('*')
                .order('name');

            if (storeData) {
                setStores(storeData.map(s => ({
                    id: s.id,
                    cnpj: s.cnpj,
                    name: s.name,
                    api_key: s.api_key,
                    open_time: s.open_time,
                    close_time: s.close_time,
                    is_active: s.is_active,
                    cep: s.cep || "",
                    address: s.address || "",
                    number: s.number || "",
                    complement: s.complement || "",
                    neighborhood: s.neighborhood || "",
                    city: s.city || "",
                    state: s.state || ""
                })));
            }
        }
        setIsLoading(false);
    };

    const handleStoreChange = (idx: number, field: keyof StoreCredential, value: any) => {
        const newStores = [...stores];
        newStores[idx] = { ...newStores[idx], [field]: value };
        setStores(newStores);
    };

    const addStore = () => {
        setStores([...stores, {
            name: "",
            cnpj: "",
            api_key: "",
            open_time: "07:00:00",
            close_time: "23:00:00",
            is_active: true,
            cep: "",
            address: "",
            number: "",
            complement: "",
            neighborhood: "",
            city: "",
            state: ""
        }]);
    };

    const handleCepLookup = async (idx: number, cep: string) => {
        const cleanCep = cep.replace(/\D/g, '');
        handleStoreChange(idx, 'cep', cleanCep);

        if (cleanCep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await res.json();

                if (!data.erro) {
                    const newStores = [...stores];
                    newStores[idx] = {
                        ...newStores[idx],
                        address: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf
                    };
                    setStores(newStores);
                }
            } catch (e) {
                console.error("CEP Lookup failed:", e);
            }
        }
    };

    const removeStore = async (idx: number) => {
        const store = stores[idx];
        if (store.id) {
            if (!confirm(`Deseja realmente excluir a loja ${store.name}?`)) return;
            const { error } = await supabase.from('stores').delete().eq('id', store.id);
            if (error) {
                alert("Erro ao excluir do banco de dados.");
                return;
            }
        }
        setStores(stores.filter((_, i) => i !== idx));
    };



    const handleSave = async () => {
        setIsLoading(true);

        // 1. Save VMPay Account to Profile (Using UPSERT for first-time creation)
        if (user) {
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: user.id,
                email: user.email,
                vmpay_user: vmpayUser,
                vmpay_password: vmpayPass,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

            if (profileError) {
                console.error("Profile Save Error:", profileError);
                alert(`Erro ao salvar perfil: ${profileError.message}`);
            }
        }

        // 2. Save Stores to Supabase
        let storeErrors = 0;
        for (const store of stores) {
            const { error } = await supabase
                .from('stores')
                .upsert({
                    id: store.id,
                    cnpj: store.cnpj,
                    name: store.name,
                    api_key: store.api_key,
                    open_time: store.open_time,
                    close_time: store.close_time,
                    is_active: store.is_active,
                    cep: store.cep,
                    address: store.address,
                    number: store.number,
                    complement: store.complement,
                    neighborhood: store.neighborhood,
                    city: store.city,
                    state: store.state,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'cnpj' });

            if (error) {
                console.error(`Error saving store ${store.name}:`, error);
                storeErrors++;
            }
        }

        if (storeErrors > 0) {
            alert(`Aviso: ${storeErrors} lojas não puderam ser salvas. Verifique o console.`);
        }

        // 3. Save Automation Settings
        setAutomationSettings(localAutomation);

        // 4. Log Activity
        try {
            await logActivity("STORE_UPDATE", user?.id || null, {
                vmpayAccount: !!vmpayUser,
                storeCount: stores.length
            });
        } catch (e) {
            console.warn("Activity logging failed (RLS?):", e);
        }

        setIsLoading(false);
        if (storeErrors === 0) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
        loadData(); // Refresh IDs for new stores
    };

    const testStoreConnection = async (idx: number) => {
        const store = stores[idx];
        if (!store.api_key) {
            alert('Insira a Chave de API primeiro.');
            return;
        }

        try {
            // Simple proxy test (in a real scenario, this should be done via backend to avoid CORS)
            // But for this MVP, we alert based on status
            const res = await fetch(`https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1/maquinas`, {
                headers: { 'x-api-key': store.api_key }
            });
            if (res.ok) alert(`Conexão com ${store.name} Bem-sucedida!`);
            else alert(`Erro: ${res.status} - Credenciais inválidas para ${store.name}`);
        } catch (e) {
            alert('Falha interna ao testar conexão.');
        }
    };

    const handleTuyaChange = (storeName: string, field: string, value: string | number) => {
        setLocalAutomation(prev => {
            const current = prev[storeName] || {
                status: 'DESATIVADO',
                minLavagem: 30,
                minSecagem: 45,
                tuyaAccessId: '',
                tuyaAccessSecret: '',
                tuyaDeviceId: '',
                tuyaHubId: '',
                tuyaSceneOnId: '',
                tuyaSceneOffId: ''
            };
            return {
                ...prev,
                [storeName]: { ...current, [field]: value }
            };
        });
    };

    const testTuyaConnection = async (storeName: string) => {
        const settings = localAutomation[storeName];
        if (!settings || !settings.tuyaAccessId || !settings.tuyaAccessSecret || !settings.tuyaDeviceId) {
            alert('Preencha as credenciais da Tuya primeiro.');
            return;
        }

        try {
            const res = await fetch(`/api/tuya?action=status&deviceId=${settings.tuyaDeviceId}`, {
                headers: {
                    'x-tuya-id': settings.tuyaAccessId,
                    'x-tuya-secret': settings.tuyaAccessSecret
                }
            });
            const data = await res.json();
            if (res.ok && data.success) alert('Conexão Tuya Bem-sucedida!');
            else alert(`Erro na conexão Tuya: ${data.error || 'Verifique as credenciais.'}`);
        } catch (e) {
            alert('Falha ao contatar API Tuya.');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-20 p-4">
            {/* Header */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute -right-16 -top-16 text-indigo-500/5 pointer-events-none">
                    <Settings className="w-96 h-96" />
                </div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3 relative z-10">
                    <Settings className="w-6 h-6 text-indigo-500" />
                    Painel Administrativo Lavly
                </h2>
                <p className="text-neutral-400 mt-2 relative z-10">
                    Gerencie suas lojas, credenciais VMPay e configurações de automação.
                </p>
            </div>

            {/* VMPay Account Credentials (MASTER) */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-indigo-500" />
                    Conta Mestra VMPay
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">E-mail da Conta</label>
                        <input
                            type="email"
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                            placeholder="seu@email.com.br"
                            value={vmpayUser}
                            onChange={(e) => setVmpayUser(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Senha da Conta</label>
                        <div className="relative">
                            <input
                                type={showPass ? "text" : "password"}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="********"
                                value={vmpayPass}
                                onChange={(e) => setVmpayPass(e.target.value)}
                            />
                            <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2 text-neutral-500">
                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
                <p className="text-[10px] text-neutral-500 mt-3 italic">
                    * Essas credenciais permitem ao Lavly sincronizar todas as lojas de forma centralizada.
                </p>
            </div>

            {/* VMPay Stores (INDIVIDUAL) */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Store className="w-5 h-5 text-emerald-500" />
                        Lojas & APIs Individuais
                    </h3>
                    <button onClick={addStore} className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
                        <Plus className="w-4 h-4" />
                        Nova Loja
                    </button>
                </div>

                {isLoading ? (
                    <div className="py-12 flex justify-center"><RefreshCw className="animate-spin text-neutral-500" /></div>
                ) : (
                    <div className="space-y-6">
                        {stores.map((store, idx) => (
                            <div key={idx} className="p-5 border border-neutral-800 rounded-xl bg-neutral-950/50 space-y-4 group">
                                <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                                    <input
                                        type="text"
                                        placeholder="Nome da Loja"
                                        className="bg-transparent border-none text-white font-bold text-lg focus:outline-none placeholder:text-neutral-700 w-full"
                                        value={store.name}
                                        onChange={(e) => handleStoreChange(idx, 'name', e.target.value)}
                                    />
                                    <button onClick={() => removeStore(idx)} className="p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase">CNPJ (Identificador Único)</label>
                                        <input
                                            type="text"
                                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
                                            placeholder="00.000.000/0001-00"
                                            value={store.cnpj}
                                            onChange={(e) => handleStoreChange(idx, 'cnpj', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Chave de API (x-api-key)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="password"
                                                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
                                                value={store.api_key}
                                                onChange={(e) => handleStoreChange(idx, 'api_key', e.target.value)}
                                            />
                                            <button onClick={() => testStoreConnection(idx)} className="px-3 bg-neutral-800 text-[10px] font-bold text-neutral-400 rounded-lg hover:bg-neutral-700">Testar</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Abe às</label>
                                            <input
                                                type="text"
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
                                                value={store.open_time}
                                                onChange={(e) => handleStoreChange(idx, 'open_time', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Fecha às</label>
                                            <input
                                                type="text"
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
                                                value={store.close_time}
                                                onChange={(e) => handleStoreChange(idx, 'close_time', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-end">
                                        <div className="flex items-center gap-2 ml-auto">
                                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Status:</span>
                                            <button
                                                onClick={() => handleStoreChange(idx, 'is_active', !store.is_active)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${store.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}
                                            >
                                                {store.is_active ? 'ATIVO' : 'INATIVO'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Address Section */}
                                <div className="pt-4 border-t border-neutral-800 space-y-4">
                                    <div className="flex items-center gap-2 text-indigo-400">
                                        <MapPin className="w-3 h-3" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Endereço & Localização</span>
                                    </div>

                                    <div className="grid md:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase">CEP</label>
                                            <input
                                                type="text"
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                                placeholder="00000-000"
                                                maxLength={9}
                                                value={store.cep || ''}
                                                onChange={(e) => handleCepLookup(idx, e.target.value)}
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Logradouro</label>
                                            <input
                                                type="text"
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                                placeholder="Rua, Avenida..."
                                                value={store.address || ''}
                                                onChange={(e) => handleStoreChange(idx, 'address', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Número</label>
                                            <input
                                                type="text"
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                                placeholder="123"
                                                value={store.number || ''}
                                                onChange={(e) => handleStoreChange(idx, 'number', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Complemento</label>
                                            <input
                                                type="text"
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                                placeholder="Sala, Andar..."
                                                value={store.complement || ''}
                                                onChange={(e) => handleStoreChange(idx, 'complement', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Bairro</label>
                                            <input
                                                type="text"
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                                placeholder="Bairro"
                                                value={store.neighborhood || ''}
                                                onChange={(e) => handleStoreChange(idx, 'neighborhood', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Cidade</label>
                                            <input
                                                type="text"
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                                placeholder="Cidade"
                                                value={store.city || ''}
                                                onChange={(e) => handleStoreChange(idx, 'city', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Estado (UF)</label>
                                            <input
                                                type="text"
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                                placeholder="CE"
                                                maxLength={2}
                                                value={store.state || ''}
                                                onChange={(e) => handleStoreChange(idx, 'state', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {stores.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed border-neutral-800 rounded-xl">
                                <p className="text-neutral-500 text-sm">Nenhuma loja cadastrada.</p>
                                <button onClick={addStore} className="text-emerald-500 text-xs font-bold mt-2">Clique para adicionar sua primeira loja</button>
                            </div>
                        )}
                    </div>
                )}
            </div>



            {/* Save Button (Sticky/Bottom) */}
            <div className="flex justify-end pt-4 pb-12 border-t border-neutral-800">
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                >
                    {saved ? (
                        <>
                            <CheckCircle className="w-5 h-5 animate-in zoom-in" />
                            Configurações Salvas!
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// Keeping original Tuya tests for reference
export const __TuyaRef = {
    // These methods can be integrated as needed but the priority is store management
};
