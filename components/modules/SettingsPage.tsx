import { useSettings, AutomationSettingsMap } from "@/components/context/SettingsContext";
import { Settings, MapPin, Key, Save, CheckCircle, Store, Clock, RefreshCw, Trash2, Plus, User, Eye, EyeOff } from "lucide-react";
import { STATIC_VMPAY_CREDENTIALS } from "@/lib/vmpay-config";
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
    latitude?: number;
    longitude?: number;
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
    const [isSaving, setIsSaving] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [localAutomation, setLocalAutomation] = useState<AutomationSettingsMap>({});
    const [saved, setSaved] = useState(false);
    const [cepsLoading, setCepsLoading] = useState<Record<number, boolean>>({});

    // Sync local automation when context loads
    useEffect(() => {
        if (Object.keys(automationSettings).length > 0 && Object.keys(localAutomation).length === 0) {
            setLocalAutomation(automationSettings);
        }
    }, [automationSettings]);

    useEffect(() => {
        if (!isInitialized) {
            loadData();
        }
    }, [user?.id, isInitialized]);

    const loadData = async (force = false) => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        if (isInitialized && !force) return;

        setIsLoading(true);

        // Failsafe timeout to prevent infinite loading if Supabase hangs
        const timeoutId = setTimeout(() => {
            console.warn("SettingsPage: loadData timed out. Forcing UI unblock.");
            setIsLoading(false);
            setIsInitialized(true);
        }, 10000);

        try {
            console.log("SettingsPage: Loading configuration data...");
            if (user) {
                // 1. Fetch Profile (VMPay Master Account)
                const { data: profile, error: profileErr } = await supabase
                    .from('profiles')
                    .select('vmpay_user, vmpay_password')
                    .eq('id', user.id)
                    .single();

                if (profileErr && profileErr.code !== 'PGRST116') {
                    console.error("SettingsPage: Profile fetch error", profileErr);
                }

                if (profile) {
                    setVmpayUser(profile.vmpay_user || "");
                    setVmpayPass(profile.vmpay_password || "");
                }

                // 2. Fetch Stores
                const { data: storeData, error: storesErr } = await supabase
                    .from('stores')
                    .select('*')
                    .order('name');

                if (storesErr) throw storesErr;

                if (storeData && storeData.length > 0) {
                    setStores(storeData.map(s => ({
                        id: s.id,
                        cnpj: s.cnpj || "",
                        name: s.name || "Sem Nome",
                        api_key: s.api_key || "",
                        open_time: s.open_time || "07:00:00",
                        close_time: s.close_time || "23:00:00",
                        is_active: s.is_active !== false,
                        cep: s.cep || "",
                        address: s.address || "",
                        number: s.number || "",
                        complement: s.complement || "",
                        neighborhood: s.neighborhood || "",
                        city: s.city || "",
                        state: s.state || "",
                        latitude: s.latitude,
                        longitude: s.longitude
                    })));
                } else {
                    console.log("SettingsPage: Bank is empty. Auto-seeding Static Fallback Stores.");
                    // Fallback to static credentials so the user isn't stuck with an empty form
                    setStores(STATIC_VMPAY_CREDENTIALS.map(s => ({
                        cnpj: s.cnpj || "",
                        name: s.name || "Sem Nome",
                        api_key: s.apiKey || "",
                        open_time: s.openTime || "07:00:00",
                        close_time: s.closeTime || "23:00:00",
                        is_active: s.is_active !== false,
                    })));
                }
                setIsInitialized(true);
            }
        } catch (e: any) {
            console.error("SettingsPage: Critical error in loadData", e);
            // Ensure we don't trap the user in a loading screen if the DB schema is mismatched
            setIsInitialized(true);
        } finally {
            clearTimeout(timeoutId);
            setIsLoading(false);
        }
    };

    const handleStoreChange = (idx: number, field: keyof StoreCredential, value: any) => {
        setStores(prev => {
            const newStores = [...prev];
            if (newStores[idx]) {
                newStores[idx] = { ...newStores[idx], [field]: value };
            }
            return newStores;
        });
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
            state: "",
            latitude: undefined,
            longitude: undefined
        }]);
    };

    const handleCepLookup = async (idx: number, cep: string) => {
        const cleanCep = cep.replace(/\D/g, '');

        // Simple CEP Mask: XXXXX-XXX
        let maskedCep = cleanCep;
        if (cleanCep.length > 5) {
            maskedCep = cleanCep.replace(/^(\d{5})(\d)/, '$1-$2');
        }

        // Update input visually right away
        handleStoreChange(idx, 'cep', maskedCep);

        if (cleanCep.length === 8) {
            setCepsLoading(prev => ({ ...prev, [idx]: true }));
            try {
                console.log(`SettingsPage: Searching CEP ${cleanCep}...`);
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                if (!res.ok) throw new Error("ViaCEP unreachable");
                const data = await res.json();

                if (!data.erro) {
                    setStores(prev => {
                        const newStores = [...prev];
                        if (newStores[idx]) {
                            newStores[idx] = {
                                ...newStores[idx],
                                address: data.logradouro || newStores[idx].address || "",
                                neighborhood: data.bairro || newStores[idx].neighborhood || "",
                                city: data.localidade || newStores[idx].city || "",
                                state: data.uf || newStores[idx].state || ""
                            };
                        }
                        return newStores;
                    });
                    console.log(`SettingsPage: ViaCEP applied for ${cleanCep} -> ${data.logradouro}`);
                } else {
                    console.warn(`SettingsPage: CEP ${cleanCep} was flagged as non-existent by ViaCEP.`);
                }
            } catch (e) {
                console.error("SettingsPage: ViaCEP Lookup failed natively", e);
            } finally {
                setCepsLoading(prev => ({ ...prev, [idx]: false }));
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
        if (isSaving) return;

        // Basic Validation
        const invalidStores = stores.filter(s => !s.name || !s.cnpj);
        if (invalidStores.length > 0) {
            alert(`Por favor, preencha o Nome e o CNPJ de todas as lojas. (${invalidStores.length} lojas incompletas)`);
            return;
        }

        setIsSaving(true);
        setSaved(false);

        try {
            console.log("SettingsPage: Initiating save process...");

            // 1. Save VMPay Account to Profile (Master Account)
            if (user && (vmpayUser || vmpayPass)) {
                console.log("SettingsPage: Updating user profile...");
                const { error: profileError } = await supabase.from('profiles').upsert({
                    id: user.id,
                    email: user.email,
                    vmpay_user: vmpayUser,
                    vmpay_password: vmpayPass,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

                if (profileError) {
                    console.error("SettingsPage: Profile save error", profileError);
                    throw new Error(`Erro ao salvar perfil: ${profileError.message}`);
                }
            }

            // 2. Geocode and Save ALL Stores to Supabase
            if (stores.length > 0) {
                const { getCoordinatesFromAddress } = await import("@/lib/weather");

                const storesPayload = await Promise.all(stores.map(async (store) => {
                    let lat = store.latitude;
                    let lon = store.longitude;

                    // Re-geocode if address changed or coordinates missing
                    if (store.address && (!lat || !lon)) {
                        console.log(`SettingsPage: Geocoding address for ${store.name}...`);
                        const coords = await getCoordinatesFromAddress(store.address, store.city, store.state);
                        if (coords) {
                            lat = coords.lat;
                            lon = coords.lon;
                        }
                    }

                    return {
                        id: store.id || undefined,
                        cnpj: store.cnpj.replace(/\D/g, ''),
                        name: store.name || "Sem Nome",
                        api_key: store.api_key || "",
                        open_time: store.open_time || "07:00:00",
                        close_time: store.close_time || "23:00:00",
                        is_active: store.is_active,
                        cep: store.cep?.replace(/\D/g, '') || "",
                        address: store.address || "",
                        number: store.number || "",
                        complement: store.complement || "",
                        neighborhood: store.neighborhood || "",
                        city: store.city || "",
                        state: store.state || "",
                        latitude: lat,
                        longitude: lon,
                        updated_at: new Date().toISOString()
                    };
                }));

                console.log(`SettingsPage: Upserting ${storesPayload.length} stores...`);
                const { error: storeError } = await supabase
                    .from('stores')
                    .upsert(storesPayload, { onConflict: 'cnpj' });

                if (storeError) {
                    console.error("SettingsPage: Store upsert error", storeError, storesPayload);
                    throw new Error(`Erro ao salvar lojas: ${storeError.message}`);
                }
            }

            // 3. Save Automation Settings (Context/LocalStorage)
            setAutomationSettings(localAutomation);

            // 4. Log Activity (Non-blocking)
            logActivity("STORE_UPDATE", user?.id || null, {
                vmpayAccount: !!vmpayUser,
                storeCount: stores.length
            }).catch(err => console.warn("SettingsPage: Failed to log activity", err));

            console.log("SettingsPage: All data saved successfully.");
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);

            // Refresh data from DB to ensure local state is in sync with assigned IDs
            await loadData(true);

        } catch (e: any) {
            console.error("SettingsPage: Save Error", e);
            alert(`Erro Crítico ao Salvar: ${e.message || "Erro de conexão com o Supabase"}`);
        } finally {
            setIsSaving(false);
        }
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
        setLocalAutomation((prev: AutomationSettingsMap) => {
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
                    <div className="py-12 flex flex-col items-center justify-center gap-4">
                        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                        <span className="text-sm text-neutral-500 font-mono">Carregando Lojas...</span>
                    </div>
                ) : stores.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-4 border border-dashed border-neutral-800 rounded-xl bg-neutral-950/30">
                        <Store className="w-12 h-12 text-neutral-700" />
                        <p className="text-neutral-500 text-sm">Nenhuma loja cadastrada.</p>
                        <button onClick={addStore} className="text-emerald-500 hover:underline text-xs">Adicionar a primeira loja</button>
                    </div>
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
                                        {store.latitude && store.longitude && (
                                            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-bold border border-indigo-500/20">
                                                COORDENADAS ATIVAS
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid md:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center justify-between">
                                                CEP
                                                {cepsLoading[idx] && <RefreshCw className="w-2 h-2 animate-spin text-indigo-500" />}
                                            </label>
                                            <input
                                                type="text"
                                                className={`w-full bg-neutral-900 border ${cepsLoading[idx] ? 'border-indigo-500/50' : 'border-neutral-800'} rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none`}
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
                    disabled={isLoading || isSaving}
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
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
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
