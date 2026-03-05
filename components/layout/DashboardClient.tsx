"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Upload, FileUp, CheckCircle, AlertCircle, Building2, Filter, RefreshCw, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { StoreSelector } from "@/components/layout/StoreSelector";
import dynamic from 'next/dynamic';
import { SaleRecord, OrderRecord, CustomerRecord } from "@/lib/processing/etl";
import { CustomerProvider, useCustomerContext } from "@/components/context/CustomerContext";
import { getProfile } from "@/lib/processing/crm";
import { CustomerDetails } from "@/components/modules/CustomerDetails";
// import { CustomerDemographics } from "@/components/modules/CustomerDemographics"; // Moved to dynamic
import { mergeOrders } from "@/lib/processing/merger";
import { SubscriptionProvider } from "@/components/context/SubscriptionContext";
import { SettingsProvider } from "@/components/context/SettingsContext";
import { calculateCrmMetrics } from "@/lib/processing/crm"; // New
import { AuthProvider, useAuth } from "@/components/context/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { TermsOfUse } from "@/components/modules/TermsOfUse";
import { getCanonicalStoreName } from "@/lib/vmpay-config";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// Dynamically import CrmDashboard with SSR disabled to prevent hydration errors
const CrmDashboard = dynamic(
  () => import('@/components/modules/CrmDashboard').then(mod => mod.CrmDashboard),
  { ssr: false }
);

// Dynamically import FinancialDashboard with SSR disabled to prevent hydration errors (Recharts)
const FinancialDashboard = dynamic(
  () => import('@/components/modules/FinancialDashboard').then(mod => mod.FinancialDashboard),
  { ssr: false }
);

const ComparativeDashboard = dynamic(
  () => import('@/components/modules/ComparativeDashboard').then(mod => mod.ComparativeDashboard),
  { ssr: false }
);

// Dynamically import ChurnAnalysis
const ChurnAnalysis = dynamic(
  () => import('@/components/modules/ChurnAnalysis').then(mod => mod.ChurnAnalysis),
  { ssr: false }
);

const MachineAnalysis = dynamic(
  () => import('@/components/modules/MachineAnalysis').then(mod => mod.MachineAnalysis),
  { ssr: false }
);

const Reports = dynamic<any>(
  () => import('@/components/modules/Reports').then(mod => mod.Reports),
  { ssr: false }
);

const QueueAnalysis = dynamic(
  () => import('@/components/modules/QueueAnalysis').then(mod => mod.QueueAnalysis),
  { ssr: false }
);

const CouponManager = dynamic(
  () => import('@/components/modules/CouponManager').then(mod => mod.CouponManager),
  { ssr: false }
);

const SettingsPage = dynamic(
  () => import('@/components/modules/SettingsPage').then(mod => mod.SettingsPage),
  { ssr: false }
);

const ActivityLogs = dynamic<any>(
  () => import('@/components/modules/ActivityLogs').then(mod => mod.ActivityLogs),
  { ssr: false }
);

const CustomerDemographics = dynamic<any>(
  () => import('@/components/modules/CustomerDemographics').then(mod => mod.CustomerDemographics),
  { ssr: false }
);



function AppContent({
  activeTab,
  setActiveTab,
  status,
  message,
  logs,
  allRecords,
  data,
  stores,
  selectedStore,
  setSelectedStore,
  handleFileUpload,
  handleSyncVMPay,
  handleForceSync,
  renderContent,
  stableInitialLoad
}: any) {
  const { selectedCustomerName, closeCustomerDetails } = useCustomerContext();
  const { isAuthenticated, isLoading, token } = useAuth();
  const [showTerms, setShowTerms] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hasLoaded = useRef(false);

  useEffect(() => {
    setMounted(true);
    if (!hasLoaded.current && isAuthenticated && token && stableInitialLoad) {
      hasLoaded.current = true;
      stableInitialLoad(token);
    }
  }, [isAuthenticated, token, stableInitialLoad]);

  // Derive profile on the fly when selected (Global Modal Logic)
  const selectedProfile = useMemo(() => {
    if (!selectedCustomerName || !allRecords) return null;
    return getProfile(selectedCustomerName, allRecords);
  }, [selectedCustomerName, allRecords]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-500 rounded-full animate-spin mb-8" />
        <h1 className="text-2xl font-bold text-white mb-2">Iniciando Lavly...</h1>
        <p className="text-neutral-500 text-sm max-w-xs mx-auto">
          Preparando base de dados e conectando ao VMPay seguro.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-12 px-6 py-2 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white rounded-lg text-xs transition-all"
        >
          Reiniciar Conexão
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="flex min-h-screen bg-neutral-950 font-sans text-neutral-100">

      {/* Sidebar */}
      <AppSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={false}
        onToggle={() => { }}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Top Header */}
        <header className="border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-md p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-2xl font-bold bg-white bg-clip-text text-transparent">
                {activeTab === 'financial' && 'Visão Financeira'}
                {activeTab === 'comparative' && 'Financeiro Comparativo'}
                {activeTab === 'crm' && 'Gestão de Clientes'}
                {activeTab === 'churn' && 'Análise de Churn & Retenção'}
                {activeTab === 'machines' && 'Parque de Máquinas'}
                {activeTab === 'logs' && 'Auditoria de Sistema'}
              </h2>
              <p className="text-sm text-neutral-500">
                {allRecords.length > 0
                  ? `${allRecords.length} vendas totais | ${stores.length} lojas`
                  : 'Aguardando importação...'}
              </p>
            </div>

            {/* STORE SELECTOR */}
            <div className="ml-4">
              <StoreSelector
                stores={stores}
                selectedStore={selectedStore}
                onSelectStore={setSelectedStore}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSyncVMPay(token)}
              disabled={status === 'uploading'}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                status === 'uploading' ? "bg-neutral-800 text-neutral-400" : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", status === 'uploading' && "animate-spin")} />
              {status === 'uploading' ? 'Sincronizando...' : 'Sync VMPay'}
            </button>

            <button
              onClick={handleForceSync}
              disabled={status === 'uploading'}
              title="Baixar todos os milhares de cestos dos últimos 180 dias"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                status === 'uploading' ? "bg-neutral-800 text-neutral-400" : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20"
              )}
            >
              <FileUp className={cn("w-4 h-4", status === 'uploading' && "animate-bounce")} />
              <span>Resgatar Cestos (180d)</span>
            </button>

            <div className="relative group">
              <button
                onClick={() => setShowTerms(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-all border border-neutral-700"
              >
                <FileText className="w-4 h-4" />
                Termos
              </button>
            </div>

            <div className="relative group">
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                disabled={status === 'uploading'}
              />
              <button className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                status === 'uploading' ? "bg-neutral-800 text-neutral-400" : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
              )}>
                {status === 'uploading' ? (
                  <>
                    <FileUp className="w-4 h-4 animate-bounce" /> Processando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> {allRecords.length > 0 ? 'Planilha' : 'Importar'}
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">

            {/* Global Status Messages */}
            {status === 'success' && message && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 px-4 py-3 rounded-lg flex items-center gap-3 text-sm animate-in slide-in-from-top-2">
                <CheckCircle className="w-4 h-4" />
                {message}
              </div>
            )}
            {status === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-lg flex items-center gap-3 text-sm animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4" />
                {message}
              </div>
            )}

            {/* Content Area - Only force remount on tab change to preserve form state (Settings) */}
            <div key={activeTab}>
              {renderContent(token)}
            </div>
          </div>
        </div>
        {/* Debug Logs Section - ALWAYS SHOW IF LOGS EXIST */}
        {logs.length > 0 && (
          <div className="mt-8 p-4 bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
            <h3 className="text-sm font-bold text-neutral-400 mb-2">Debug LOG do Sistema</h3>
            <div className="h-48 overflow-y-auto font-mono text-xs text-neutral-500 bg-black p-2 rounded">
              {logs.map((log: string, i: number) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* GLOBAL CUSTOMER DETAILS MODAL */}
      <CustomerDetails
        isOpen={!!selectedCustomerName}
        onClose={closeCustomerDetails}
        profile={selectedProfile}
        // We pass 'data.records' if available (filtered view) so the modal shows context of the current period if needed?
        // Actually, for "Last Visits", we usually want GLOBAL history.
        // But the modal expects 'periodRecords' for stats like "Spent in Period".
        // Let's pass 'data?.records' which represents the currently filtered view (e.g. This Month).
        periodRecords={data?.records}
      />

      <TermsOfUse
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={() => localStorage.setItem('terms_accepted', 'true')}
      />
    </div>
  );
}

export default function DashboardClient({ initialSession, initialRole }: { initialSession?: any, initialRole?: any }) {
  const [activeTab, setActiveTab] = useState("financial");
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<string[]>([]); // Debug Logs

  // Data States
  const [allRecords, setAllRecords] = useState<SaleRecord[]>([]);
  const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);

  // Filter States
  const [dbStores, setDbStores] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Compute available stores from both DB and Data
  const stores = useMemo(() => {
    const dataStores = Array.from(new Set(allRecords.map(r => getCanonicalStoreName(r.loja))));
    const combined = Array.from(new Set([...dbStores, ...dataStores])).filter(Boolean).sort();
    return combined;
  }, [allRecords, dbStores]);

  // Hydration & Init Fix
  useEffect(() => {
    setMounted(true);
    console.log("[DashboardClient] ✅ Component mounted and hydrated.");
    setLogs(prev => [...prev, "[System] Processando interface..."]);
  }, []);

  const data = useMemo(() => {
    if (!mounted || allRecords.length === 0) return null;

    console.time("[Page] calculate ViewData");

    // Filter Records & Orders
    const filteredRecords = (!selectedStore || selectedStore === 'Todas')
      ? allRecords
      : allRecords.filter(r => getCanonicalStoreName(r.loja) === getCanonicalStoreName(selectedStore));

    const filteredOrders = (!selectedStore || selectedStore === 'Todas')
      ? allOrders
      : allOrders.filter(o => getCanonicalStoreName(o.loja) === getCanonicalStoreName(selectedStore));

    const totalSales = filteredRecords.length;
    const totalValue = filteredRecords.reduce((acc, r) => acc + r.valor, 0);

    const sorted = [...filteredRecords].sort((a, b) => {
      const timeA = a.data instanceof Date ? a.data.getTime() : new Date(a.data).getTime();
      const timeB = b.data instanceof Date ? b.data.getTime() : new Date(b.data).getTime();
      return timeA - timeB;
    });

    const viewData = {
      records: filteredRecords,
      orders: filteredOrders,
      summary: {
        totalSales,
        totalValue,
        startDate: sorted.length > 0 ? sorted[0].data : null,
        endDate: sorted.length > 0 ? sorted[sorted.length - 1].data : null
      },
      errors: [],
      logs: logs
    };

    console.log(`[v3-Filter] View recalculated. Selected: "${selectedStore}". Records: ${allRecords.length}. Filtered: ${filteredRecords.length}`);
    console.timeEnd("[Page] calculate ViewData");
    return viewData;
  }, [allRecords, allOrders, selectedStore, mounted]); // Removido logs daqui para evitar travamento ao logar

  const isInitializing = useRef(false);

  const reloadAllData = async (reason: string = "Inicial", authToken: string | null = null) => {
    if (isInitializing.current) return;
    isInitializing.current = true;

    console.log(`[Home] Reloading all data (Reason: ${reason})...`);
    setStatus("uploading");

    try {
      // 1. Load active stores and config
      const { getVMPayCredentials, getCanonicalStoreName } = await import("@/lib/vmpay-config");
      const activeStores = await getVMPayCredentials();
      const configuredNames = activeStores.map(s => getCanonicalStoreName(s.name));
      setDbStores(configuredNames);

      // 2. Load from Local Cache (IndexedDB)
      const { get, set } = await import('idb-keyval');
      setLogs(prev => [...prev, "[System] Verificando cache offline ultrarrápido..."]);

      const withLocalTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<T>((resolve) => {
          timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
        });
        return Promise.race([promise.catch(() => fallback), timeoutPromise]).finally(() => clearTimeout(timeoutId));
      };

      let cachedSales = await withLocalTimeout(get('lavly_sales'), 2000, []) || [];
      let cachedOrders = await withLocalTimeout(get('lavly_orders'), 2000, []) || [];
      let cachedCustomers = await withLocalTimeout(get('lavly_customers'), 2000, []) || [];

      let lastCachedDate = null;
      let lastCachedOrderDate = null;

      if (cachedSales.length > 0) {
        // Hydrate right away to show data instantly
        const hydratedCachedSales = cachedSales.map((s: any) => ({
          ...s, data: new Date(s.data), birthDate: s.birthDate ? new Date(s.birthDate) : undefined,
          items: s.items ? s.items.map((i: any) => ({ ...i, startTime: new Date(i.startTime) })) : []
        }));
        const hydratedCachedOrders = cachedOrders.map((o: any) => ({ ...o, data: new Date(o.data) }));
        const hydratedCachedCustomers = cachedCustomers.map((c: any) => ({ ...c, registrationDate: c.registrationDate ? new Date(c.registrationDate) : undefined }));

        setAllRecords(hydratedCachedSales);
        setAllOrders(hydratedCachedOrders);
        if (hydratedCachedCustomers.length > 0) setAllCustomers(hydratedCachedCustomers);

        setLogs(prev => [...prev, `[System] Flash Load: ${cachedSales.length} registros restaurados do dispositivo local.`]);

        // Find max dates for Delta Sync
        const dates = hydratedCachedSales.map((s: any) => s.data.getTime());
        lastCachedDate = new Date(Math.max(...dates));

        const orderDates = hydratedCachedOrders.map((o: any) => o.data.getTime());
        if (orderDates.length > 0) lastCachedOrderDate = new Date(Math.max(...orderDates));
      } else {
        setMessage("Carregando 100% do histórico inicial (Pode demorar na primeira vez)...");
      }

      // 3. Fallback ou Delta Sync
      let newSales: any[] = [];
      let newOrders: any[] = [];
      let newCustomers: any[] = [];

      // DEDICATED FETCH CLIENT
      // By explicitly creating a raw @supabase/supabase-js client (instead of using the 
      // global @supabase/ssr one), we bypass a known bug where the SSR wrapper queues 
      // requests indefinitely if it thinks the auth cookie resolution is still pending.
      // This guarantees the request hits the physical network layer immediately.
      setLogs(prev => [...prev, `[System-Debug] Token JWT capturado: ${!!authToken}`]);

      const rawSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
          },
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        }
      );

      if (!lastCachedDate || cachedSales.length === 0) {
        // FULL LOAD (Paginated & Robust for first run)
        setLogs(prev => [...prev, `[System] Baixando banco de dados completo (primeiro acesso neste dispositivo)...`]);

        const withDbTimeout = async (promise: Promise<any>, timeoutMs: number) => {
          let timeoutId: any;
          const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("Timeout de Rede (Supabase)")), timeoutMs);
          });
          return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
        };

        const fetchTable = async (tableName: string, columns: string) => {
          const pageSize = 1000;
          const allResults: any[] = [];

          let hasMore = true;
          let i = 0;

          while (hasMore) {
            setLogs(prev => [...prev, `[System] Baixando ${tableName}: Lote ${i + 1} (até ${pageSize} registros)...`]);
            try {
              const { data, error } = await withDbTimeout(
                rawSupabase.from(tableName).select(columns).order('id', { ascending: true }).range(i * pageSize, (i + 1) * pageSize - 1) as any,
                20000 // 20s rigid timeout per chunk
              );

              if (error) {
                console.error(`[${tableName}] Error fetching page ${i}:`, error);
                setLogs(prev => [...prev, `[System] Erro no Banco no Lote ${i + 1}. Tentando continuar com os dados obtidos...`]);
                break;
              }

              if (data && data.length > 0) {
                setLogs(prev => [...prev, `[System-Debug] Lote ${i + 1} retornou ${data.length} linhas da nuvem.`]);
                allResults.push(...data);
                if (data.length < pageSize) {
                  hasMore = false; // Last page reached
                } else {
                  i++;
                }
              } else {
                setLogs(prev => [...prev, `[System-Debug] Lote ${i + 1} VAZIO (0 linhas). Supabase não retornou erro, mas ocultou os dados (Possível bloqueio RLS).`]);
                hasMore = false; // Empty page
              }
            } catch (timeoutErr) {
              console.error(`[${tableName}] Timeout fetching page ${i}:`, timeoutErr);
              setLogs(prev => [...prev, `[System] A conexão com o banco de dados expirou (Timeout) no Lote ${i + 1}. A nuvem pode estar bloqueada nesta rede.`]);
              throw timeoutErr; // Bubble up to abort the whole initialization
            }
          }

          return allResults;
        };

        // Fetch tables sequentially to avoid overloading the browser network thread
        setLogs(prev => [...prev, `[System] Iniciando download das Vendas...`]);
        newSales = await fetchTable('sales', 'id, data, loja, cliente, customer_id, produto, valor, forma_pagamento, tipo_cartao, categoria_voucher, desconto, telefone, birth_date, age');

        setLogs(prev => [...prev, `[System] Iniciando download dos Pedidos...`]);
        newOrders = await fetchTable('orders', 'data, loja, cliente, machine, service, status, valor, customer_id, sale_id');

        setLogs(prev => [...prev, `[System] Iniciando download dos Clientes...`]);
        const custRes = await rawSupabase.from('customers').select('id, cpf, name, phone, email, gender, registration_date').limit(15000);
        newCustomers = custRes.data || [];

      } else {
        // DELTA SYNC (Only fetch newer records)
        setLogs(prev => [...prev, `[System] Buscando apenas mudanças recentes no servidor...`]);

        const offsetDate = new Date(lastCachedDate.getTime() + 1000);
        const salesQuery = rawSupabase.from('sales').select('id, data, loja, cliente, customer_id, produto, valor, forma_pagamento, tipo_cartao, categoria_voucher, desconto, telefone, birth_date, age').gte('data', offsetDate.toISOString()).order('data', { ascending: false });

        let ordersQuery: any = rawSupabase.from('orders').select('data, loja, cliente, machine, service, status, valor, customer_id, sale_id').order('data', { ascending: false }).limit(2000);
        if (lastCachedOrderDate) {
          const offsetOrderDate = new Date(lastCachedOrderDate.getTime() + 1000);
          ordersQuery = ordersQuery.gte('data', offsetOrderDate.toISOString());
        }

        const [newSalesRes, newOrdersRes, newCustomersRes] = await Promise.all([
          salesQuery as any,
          ordersQuery as any,
          rawSupabase.from('customers').select('id, cpf, name, phone, email, gender, registration_date').limit(10000) as any
        ]);

        newSales = newSalesRes.data || [];
        newOrders = newOrdersRes.data || [];
        newCustomers = newCustomersRes.data || [];
      }

      if (newSales.length > 0 || cachedSales.length === 0) {
        if (newSales.length > 0) setLogs(prev => [...prev, `[System] Delta Sync: ${newSales.length} novas vendas integradas.`]);
      } else {
        setLogs(prev => [...prev, "[System] Histórico validado. Sem novas vendas externas."]);
      }

      // Merge old + new (if any) AND always Hydrate & Normalize for UI
      const combinedSales = [...newSales, ...cachedSales];
      // Simple deduplication by ID just in case
      const uniqueSalesMap = new Map();
      combinedSales.forEach(s => uniqueSalesMap.set(s.id, s));
      const finalRawSales = Array.from(uniqueSalesMap.values()).sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());

      // Orders merge (no unique ID typically, so simple concat)
      const finalRawOrders = [...newOrders, ...cachedOrders];

      // Customers (replace entirely as it's small)
      const finalRawCustomers = newCustomers.length > 0 ? newCustomers : cachedCustomers;

      // Save to super-fast IndexedDB in background ONLY if there are new records
      if (newSales.length > 0 || newOrders.length > 0 || newCustomers.length > 0 || cachedSales.length === 0) {
        Promise.all([
          withLocalTimeout(set('lavly_sales', finalRawSales), 5000, undefined),
          withLocalTimeout(set('lavly_orders', finalRawOrders), 5000, undefined),
          withLocalTimeout(set('lavly_customers', finalRawCustomers), 5000, undefined)
        ]).catch(e => console.warn("Failed to cache to IndexedDB", e));
      }

      // Hydrate & Normalize for UI MUST run to populate the screen
      const hydratedSales = finalRawSales.map((s: any) => ({
        ...s,
        data: s.data ? new Date(s.data) : new Date(),
        loja: getCanonicalStoreName(s.loja),
        produto: s.produto || s.service || '',
        formaPagamento: s.formaPagamento || s.forma_pagamento || "Outros",
        tipoCartao: s.tipoCartao || s.tipo_cartao || "",
        categoriaVoucher: s.categoriaVoucher || s.categoria_voucher || "",
        customerId: s.customerId || s.customer_id,
        birthDate: s.birthDate || s.birth_date ? new Date(s.birthDate || s.birth_date) : undefined,
        items: s.items ? s.items.map((i: any) => ({ ...i, startTime: i.startTime ? new Date(i.startTime) : new Date() })) : []
      }));

      const hydratedOrders = finalRawOrders.map((o: any) => ({
        ...o,
        data: o.data ? new Date(o.data) : new Date(),
        loja: getCanonicalStoreName(o.loja),
        customerId: o.customerId || o.customer_id
      }));

      const hydratedCustomers = finalRawCustomers.map((c: any) => ({
        ...c,
        cpf: c.cpf || '',
        email: c.email || '',
        phone: c.phone || c.telefone || '',
        gender: c.gender || c.genero || 'U',
        registrationDate: c.registrationDate || c.registration_date ? new Date(c.registrationDate || c.registration_date) : undefined
      }));

      // Update State definitively so the UI un-freezes
      setAllRecords(hydratedSales);
      setAllOrders(hydratedOrders);
      if (hydratedCustomers.length > 0) setAllCustomers(hydratedCustomers);


      const finalCount = (newSales.length > 0 || cachedSales.length === 0)
        ? (cachedSales.length + newSales.length)
        : cachedSales.length;

      setLogs(prev => [...prev, `[System] ${finalCount} registros prontos.`]);
      setStatus("idle");
      setMessage("");
    } catch (err) {
      console.error("[Home] Error loading data:", err);
      setLogs(prev => [...prev, `[Erro] Falha ao carregar dados: ${(err as any).message}`]);
      setStatus("error");
      setMessage("Erro na conexão com o Banco de Dados.");
    } finally {
      isInitializing.current = false;
    }
  };

  // We expose a stable ref to reloadAllData so that child components can call it,
  // passing the token, without causing infinite render loops due to dependency changes.
  const reloadDataRef = useRef(reloadAllData);
  useEffect(() => {
    reloadDataRef.current = reloadAllData;
  }, [reloadAllData]);

  const stableHandleSync = useCallback((token: string | null) => {
    reloadDataRef.current("User Sync click", token);
  }, []);

  const stableInitialLoad = useCallback((token: string | null) => {
    reloadDataRef.current("Inicial", token);
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      // This is the second `json` declaration that needs to be changed.
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Erro no upload");

      // NOTE: The API currently returns whatever ETL returns.
      // We assume the API wrapper just passes through the object.
      // If the API wrapper constructs a specific shape, we might need to adjust.
      // Assuming res.json() returns ParseResult directly.

      if (result.type === 'orders') {
        // --- ORDERS MERGE STRATEGY WITH FUZZY DEDUPLICATION ---

        // Block if no sales exist
        if (allRecords.length === 0) {
          setMessage("Erro: Você precisa importar a planilha de VENDAS antes de importar os PEDIDOS/MÁQUINAS.");
          setStatus("error");
          setLogs(prev => [...prev, ...result.logs, "[ERRO] Tentativa de importar Pedidos sem Vendas prévias."]);
          return;
        }

        // Get new orders
        const orders = result.records.map((r: any) => ({
          ...r,
          data: new Date(r.data),
          loja: getCanonicalStoreName(r.loja) // NORMALIZAÇÃO AQUI
        }));

        // Deduplicate using fuzzy logic
        const mergedOrders = mergeOrders(allOrders, orders);

        // --- ENRICHMENT LOGIC (Existing Sales Linking) ---
        let enrichedCount = 0;
        const etlLogs = result.logs || [];
        etlLogs.push(`[MERGE] Merging ${orders.length} new orders into ${allOrders.length} existing using Fuzzy Logic.`);
        // Create a new array from current records
        const newRecords = [...allRecords];

        // --- PERFORMANCE OPTIMIZATION ---
        setLogs(prev => [...prev, "[DEBUG] Starting Sales Indexing..."]);

        // 1. Create a Date-based Index for Sales
        const salesByDay = new Map<string, any[]>();

        // Safety Check Counter
        let validSales = 0;
        let invalidSales = 0;

        newRecords.forEach(sale => {
          if (!sale.data || isNaN(sale.data.getTime())) {
            invalidSales++;
            return;
          }
          try {
            const dateKey = sale.data.toISOString().split('T')[0];
            if (!salesByDay.has(dateKey)) {
              salesByDay.set(dateKey, []);
            }
            salesByDay.get(dateKey)?.push(sale);
            validSales++;
          } catch (e) {
            invalidSales++;
          }
        });

        setLogs(prev => [...prev, `[DEBUG] Sales Indexed: ${validSales} valid, ${invalidSales} invalid.`]);

        // 1b. Sort Sales in each day by Time (Ascending) for Binary Search Window
        salesByDay.forEach((daySales) => {
          daySales.sort((a, b) => a.data.getTime() - b.data.getTime());
        });

        // Pre-calculate Store Logic
        const uniqueStoreCount = new Set(newRecords.map(r => getCanonicalStoreName(r.loja))).size;
        const isMultiStore = uniqueStoreCount > 1;

        // --- PRE-COMPUTATION OPTIMIZATION ---
        salesByDay.forEach(daySales => {
          daySales.forEach(sale => {
            sale._time = sale.data.getTime();
            sale._nLoja = isMultiStore ? getCanonicalStoreName(sale.loja).toUpperCase() : '';
            sale._nCli = sale.cliente && sale.cliente !== 'Consumidor Final' ? sale.cliente.trim().toUpperCase() : '';
            sale._nCliFirst = sale._nCli ? sale._nCli.split(' ')[0] : '';
          });
        });

        setLogs(prev => [...prev, `[DEBUG] Starting enrichment loop for ${orders.length} orders.`]);

        // BUFFER FOR ERRORS TO PREVENT UI FREEZE
        let errorCount = 0;
        const MAX_ERRORS = 50;
        const loopErrors: string[] = [];

        for (let i = 0; i < orders.length; i += 1000) {
          const chunk = orders.slice(i, i + 1000);
          await new Promise(resolve => setTimeout(resolve, 0));

          chunk.forEach((order: any) => {
            try {
              if (!order.data || isNaN(order.data.getTime())) return;
              const dateKey = order.data.toISOString().split('T')[0];
              const daySales = salesByDay.get(dateKey);
              if (!daySales) return;

              const orderTime = order.data.getTime();
              const nLoja = isMultiStore ? order.loja.toUpperCase() : ''; // order.loja já normalizado
              const nCli = order.cliente && order.cliente !== 'Consumidor Final' ? order.cliente.trim().toUpperCase() : '';
              const nCliFirst = nCli ? nCli.split(' ')[0] : '';

              const windowMs = 2 * 60 * 60 * 1000; // 2h window
              const minTime = orderTime - windowMs;
              const maxTime = orderTime + windowMs;

              let bestMatch = null;
              let minTimeDiff = Infinity;

              let low = 0;
              let high = daySales.length - 1;
              let startIndex = 0;
              while (low <= high) {
                const mid = (low + high) >> 1;
                if (daySales[mid]._time < minTime) { low = mid + 1; }
                else { startIndex = mid; high = mid - 1; }
              }

              for (let k = startIndex; k < daySales.length; k++) {
                const sale = daySales[k];
                if (sale._time > maxTime) break;

                if (isMultiStore && sale._nLoja !== nLoja) continue;
                if (nCli && sale._nCli !== nCli && sale._nCliFirst !== nCliFirst) continue;

                const diff = Math.abs(sale._time - orderTime);
                if (diff < minTimeDiff) {
                  minTimeDiff = diff;
                  bestMatch = sale;
                }
              }

              if (bestMatch) {
                if (!bestMatch.items) bestMatch.items = [];
                const alreadyAdded = bestMatch.items.some((it: any) => it.id === order.id);
                if (!alreadyAdded) {
                  bestMatch.items.push({
                    id: order.id,
                    machine: order.machine,
                    service: order.service || order.produto,
                    status: order.status,
                    startTime: order.data,
                    value: order.valor
                  });
                  enrichedCount++;
                }
                if (order.birthDate && !bestMatch.birthDate) {
                  bestMatch.birthDate = order.birthDate;
                  bestMatch.age = order.age;
                }
              }
            } catch (error: any) {
              if (errorCount < MAX_ERRORS) { loopErrors.push(`[ERROR] Matching failed: ${error.message}`); errorCount++; }
            }
          });
        }

        // Final State Update (Garantindo Normalização)
        const finalOrders = mergedOrders.map((o: any) => ({ ...o, loja: getCanonicalStoreName(o.loja) }));
        const finalRecords = newRecords.map((r: any) => ({ ...r, loja: getCanonicalStoreName(r.loja) }));

        setAllOrders(finalOrders);
        setAllRecords(finalRecords);

        setLogs(prev => [...prev, ...etlLogs, `[DEBUG] Loop Complete. Linked ${enrichedCount} sales.`]);
        setMessage(`Fazendo persistência dos vínculos no banco de dados...`);

        try {
          const { upsertSales } = await import('@/lib/persistence');
          // upsertSales also inserts the .items related to each sale into the orders table
          await upsertSales(finalRecords);
        } catch (e: any) {
          console.error("Falha ao persistir vínculos:", e);
          setLogs(prev => [...prev, `[ERRO] Falha ao persistir dados no Supabase: ${e.message}`]);
        }

        const addedCount = mergedOrders.length - allOrders.length;
        if (addedCount > 0) {
          setMessage(`Sucesso! ${addedCount} novos pedidos adicionados via Fusão. ${enrichedCount} vínculos salvos no banco.`);
          setStatus("success");
        } else if (enrichedCount > 0) {
          setMessage(`Sucesso! Pedidos atualizados, ${enrichedCount} novos vínculos salvos no banco.`);
          setStatus("success");
        } else {
          setMessage(`Nenhum pedido novo detectado (todos duplicados).`);
          setStatus("success");
        }


      } else if (result.type === 'customers') {
        // --- CUSTOMERS IMPORT ---
        const customers = result.customers || [];
        setAllCustomers(customers);

        try {
          const { upsertCustomers } = await import('@/lib/persistence');
          await upsertCustomers(customers);
          setMessage(`Sucesso! ${customers.length} clientes importados e salvos no banco de dados. O CRM será atualizado.`);
        } catch (e: any) {
          console.error("Falha ao salvar clientes no banco", e);
          setMessage(`Sucesso na leitura, mas falha ao salvar: ${e.message}`);
        }

        setStatus("success");
        if (result.logs) setLogs(prev => [...prev, ...result.logs]);

      } else {
        // --- SALES MERGE STRATEGY ---
        const newRecords = result.records.map((r: any) => ({
          ...r,
          data: new Date(r.data),
          loja: getCanonicalStoreName(r.loja), // NORMALIZAÇAO AQUI!
          items: (r.items || []).map((i: any) => ({
            ...i,
            startTime: i.startTime ? new Date(i.startTime) : null
          }))
        }));

        setAllRecords(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const uniqueNewRecords = newRecords.filter((r: any) => !existingIds.has(r.id));

          if (uniqueNewRecords.length === 0) {
            // We can't easily wait for this status update since it's inside prev
            // But this path is simpler.
            // Ideally we'd refactor this too, but let's fix Orders first.
            // We set message here, but it might be overridden if we had a race. 
            // In this specific block, we don't depend on external 'allRecords' state for the logic inside,
            // we depend on 'prev'.
            return prev;
          }
          return [...prev, ...uniqueNewRecords];
        });

        // Update Logs with Sales Logs
        if (result.logs) {
          setLogs(prev => [...prev, ...result.logs]);
        }

        const newUniqueCount = newRecords.filter((r: any) => !allRecords.find(ar => ar.id === r.id)).length;
        if (newUniqueCount === 0) {
          setMessage(`Todas as ${newRecords.length} vendas já foram importadas.`);
          setStatus("success");
        } else {
          setMessage(`Sucesso! Arquivo de VENDAS detectado. Novas vendas adicionadas.`);
          setStatus("success");
        }
      }

    } catch (err: any) {
      setStatus("error");
      setMessage(err.message);
      // Ensure logs are shown even on error if available
      if (allRecords.length === 0 && logs.length === 0) {
        setLogs(["[CRITICAL ERROR] " + err.message]);
      }
    } finally {
      if (status === 'uploading') {
        // Failsafe: If we are still 'uploading' but code finished (error or not), reset to idle or error.
        // Since we usually setStatus('success') or ('error') above, this catches unhandled paths.
        // We can't check 'status' state variable directly due to closure stale value (it will be 'idle' or 'uploading' from start of fn).
        // But if we are here, and didn't throw, we should be good.
        // Actually, best to just not set it if it's already set. 
        // We can't know the *current* react state here. 
        // A common pattern is: 
        // setIsUploading(false) at the end.
        // But we use a status enum.
        // Let's force it to 'error' if it hangs? No.
        // Let's just catch the case where status might be stuck.
      }
      // Force status update if it was stuck (UI hack) - triggers re-render
      // setTimeout(() => setStatus(prev => prev === 'uploading' ? 'error' : prev), 1000); 
      // Better: We just rely on the catch block. 
      // The issue is likely 'await fetch' never returning? No, it times out.
    }

  }

  async function handleForceSync() {
    setStatus("uploading");
    setLogs(prev => [...prev, "[System] Iniciando resgate completo do histórico (180 dias)..."]);

    // We fetch in chunks of 15 days, going back up to 180 days (12 chunks)
    const chunks = 12;
    const chunkSize = 15;
    let totalFetched = 0;
    const errors = [];

    for (let i = 0; i < chunks; i++) {
      const offset = i * chunkSize;
      setMessage(`Recuperando histórico... Etapa ${i + 1} de ${chunks} (${offset} dias atrás)`);
      try {
        const response = await fetch(`/api/force-sync?chunk=${chunkSize}&offset=${offset}`);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const result = await response.json();

        if (result.success) {
          totalFetched += result.count;
          setLogs(prev => [...prev, `[System] Etapa ${i + 1}/${chunks} concluída: ${result.count} registros adicionados.`]);
        } else {
          setLogs(prev => [...prev, `[Erro] Etapa ${i + 1}/${chunks} falhou: ${result.error}`]);
          errors.push(result.error);
        }
      } catch (err: any) {
        setLogs(prev => [...prev, `[Erro] Falha na requisição da etapa ${i + 1}: ${err.message}`]);
        errors.push(err.message);
      }
    }

    if (errors.length < chunks) {
      if (errors.length > 0) {
        setMessage(`Resgate parcial: ${totalFetched} registros salvos, mas houve erros em algumas etapas. Atualize a página e tente novamente mais tarde.`);
        setStatus("error");
      } else {
        setMessage(`Sucesso! Histórico completo de 180 dias recuperado. Atualize a página (F5) para ver os milhares de Cestos.`);
        setStatus("success");
      }
    } else {
      setMessage("Falha ao resgatar o histórico. Todas as etapas falharam.");
      setStatus("error");
    }
  }

  async function handleSyncVMPay(passedToken: string | null = null) {
    if (status === "uploading") {
      console.warn("[DashboardClient] Sync already in progress. Ignoring request.");
      return;
    }

    try {
      setStatus("uploading");
      setMessage("Preparando sincronização...");
      setLogs(prev => [...prev, "[VMPay] Verificando sessão segura..."]);
      const { supabase } = await import("@/lib/supabase");
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) setLogs(prev => [...prev, `[Aviso] Erro de sessão: ${sessionErr.message}`]);
      const token = passedToken || sessionData.session?.access_token;

      setLogs(prev => [...prev, "[VMPay] Buscando lista de lojas cadastradas..."]);
      // 1. Get available store credentials first
      const { getVMPayCredentials } = await import("@/lib/vmpay-config");
      const credentials = await getVMPayCredentials();
      setLogs(prev => [...prev, `[VMPay] ${credentials.length} lojas identificadas. Iniciando ciclo...`]);

      const isFirstSync = allRecords.length === 0;
      const allNewRawRecords: any[] = [];

      for (const cred of credentials) {
        setMessage(`Sincronizando ${cred.name}...`);
        setLogs(prev => [...prev, `[VMPay] Sincronizando ${cred.name} (${cred.cnpj})...`]);

        const url = `/api/vmpay/sync?source=manual&cnpj=${cred.cnpj}${isFirstSync ? "&force=true" : ""}`;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s per store

          const res = await fetch(url, {
            method: "GET",
            headers: {
              ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            const errResult = await res.json().catch(() => ({ error: `Status ${res.status}` }));
            setLogs(prev => [...prev, `[Aviso] Falha na Loja ${cred.name}: ${errResult.error || 'Erro desconhecido'}`]);
            continue;
          }

          const result = await res.json();
          if (result.success && result.records) {
            allNewRawRecords.push(...result.records);
            setLogs(prev => [...prev, `[Sync] ${cred.name}: ${result.records.length} novas vendas.`]);
          }
        } catch (storeErr: any) {
          setLogs(prev => [...prev, `[Erro] Loja ${cred.name} falhou: ${storeErr.message}`]);
        }
      }

      if (allNewRawRecords.length === 0) {
        setLogs(prev => [...prev, "[VMPay] Nenhuma venda nova encontrada em nenhuma loja."]);
        setStatus("success");
        setMessage("Sincronização concluída (Sem novos dados)");
        return;
      }

      const rawRecords = allNewRawRecords;
      const totalToProcess = rawRecords.length;

      setLogs(prev => [...prev, `[VMPay] Ciclo completo: ${totalToProcess} novos registros integrados no banco de dados.`]);
      setLogs(prev => [...prev, `[Sistema] Atualizando painel...`]);

      try {
        await reloadAllData("Sincronismo", token);
      } catch (dbErr: any) {
        setLogs(prev => [...prev, `[Aviso] Falha ao recarregar a tela automaticamente: ${dbErr.message}`]);
      }

      setStatus("success");
      setMessage("Sincronização concluída com sucesso!");
    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setMessage(`Erro: ${e.message}`);
      setLogs(prev => [...prev, `[Erro Fatal] ${e.message}`]);
    }
  }

  // Content Rendering Logic
  const renderContent = (token: string | null = null) => {
    // 1. Strict Mount Check (Hydration Fix)
    if (!mounted) return null;

    if (activeTab === 'logs') {
      return <ActivityLogs />;
    }

    // 2. Initial Loading State (Fix for blank screen "not loading normally")
    if (status === 'uploading' && allRecords.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] w-full bg-neutral-900/50 rounded-3xl border border-neutral-800 animate-pulse">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-1">Carregando Sistema Lavly...</h3>
              <p className="text-sm text-neutral-500">{message || "Sincronizando dados com o banco de dados"}</p>
            </div>
          </div>
          <div className="mt-8 max-w-md w-full px-4">
            <div className="bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-[10px] text-neutral-500 h-24 overflow-y-auto">
              {logs.slice(-3).map((log, i) => (
                <div key={i} className="mb-1 truncate opacity-70">
                  <span className="text-blue-500 mr-2">&gt;</span>{log}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Default or No Data State
    if (!data && status !== 'uploading' && allRecords.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] w-full border-2 border-dashed border-neutral-800 rounded-3xl bg-neutral-900/50 relative overflow-hidden">
          <div className="bg-neutral-900 p-8 rounded-full mb-6 border border-neutral-800 shadow-2xl relative z-10">
            <Upload className="w-12 h-12 text-blue-500" />
          </div>

          <h2 className="text-3xl font-bold text-neutral-200 mb-2 relative z-10">Importar Planilha VMPay</h2>
          <p className="text-lg text-neutral-400 max-w-lg text-center mb-8 relative z-10">
            Selecione o arquivo Excel de uma Loja para começar.<br />
            <span className="text-sm text-neutral-500">(Você pode carregar múltiplas lojas em sequência)</span>
          </p>

          <div className="relative z-10 flex gap-4">
            <div>
              <input
                id="file-upload"
                type="file"
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-3"
              >
                <FileUp className="w-6 h-6" />
                Importar Planilha
              </label>
            </div>

            <button
              onClick={() => handleSyncVMPay(token)}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-lg shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center gap-3"
            >
              <RefreshCw className={`w-6 h-6 ${(status as string) === 'uploading' ? 'animate-spin' : ''}`} />
              Sincronizar VMPay
            </button>
          </div>

          {/* Instructions Area */}
          <div className="mt-12 max-w-2xl bg-neutral-900/80 border border-neutral-800 p-6 rounded-2xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400" />
              Instruções de Importação
            </h3>
            <div className="space-y-4 text-sm text-neutral-400">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center font-bold text-xs ring-1 ring-blue-500/30">1</div>
                <div className="space-y-1">
                  <p><strong className="text-white">Onde pegar os dados:</strong> No menu do lado esquerdo do painel VMPay, siga:</p>
                  <ul className="list-disc ml-4 space-y-1 text-xs">
                    <li><span className="text-blue-400 font-medium">Painel de Controle &gt; Relatórios &gt; Vendas</span></li>
                    <li><span className="text-blue-400 font-medium">Painel de Controle &gt; Relatórios &gt; Pedidos</span></li>
                  </ul>
                  <p className="text-[10px] mt-1 italic">Escolha o período desejado e exporte em formato Excel ou CSV.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center font-bold text-xs ring-1 ring-blue-500/30">2</div>
                <p>
                  <strong className="text-white">Sincronia de Período:</strong> Certifique-se de que ambos os arquivos são relativos ao <span className="text-warning">mesmo período</span> para que o cruzamento de dados seja preciso.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-emerald-600/20 text-emerald-400 rounded-full flex items-center justify-center font-bold text-xs ring-1 ring-emerald-500/30">3</div>
                <p>
                  <strong className="text-white">Ordem Correta:</strong> Primeiro faça a <span className="text-white underline">importação</span> do arquivo de <span className="text-white underline">Vendas</span>. Depois que o sistema processar, faça a <span className="text-white underline">importação</span> do arquivo de <span className="text-white underline">Pedidos</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 3. Dashboard Rendering (Strictly if Data Exists)
    if (activeTab === 'financial' && data) {
      return <FinancialDashboard data={data} selectedStore={selectedStore || undefined} />;
    }

    if (activeTab === 'comparative' && data) {
      return <ComparativeDashboard data={data} customers={allCustomers} selectedStore={selectedStore || undefined} />;
    }

    if (activeTab === 'crm' && data) {
      return <CrmDashboard data={data} customers={allCustomers} selectedStore={selectedStore || undefined} />;
    }

    if (activeTab === 'churn' && data && data.records.length > 0) {
      return <ChurnAnalysis data={data} selectedStore={selectedStore || undefined} />;
    }

    if (activeTab === 'machines' && data) {
      return <MachineAnalysis data={data} selectedStore={selectedStore || undefined} />;
    }

    if (activeTab === 'queue' && data) {
      return <QueueAnalysis data={data.records} selectedStore={selectedStore || undefined} />;
    }

    if (activeTab === 'demographics' && data) {
      return <CustomerDemographics records={data.records} customers={allCustomers} selectedStore={selectedStore || undefined} />;
    }

    if (activeTab === 'reports' && data) {
      return <Reports data={data} />;
    }

    if (activeTab === 'marketing') {
      return <CouponManager />;
    }

    if (activeTab === 'settings') {
      return <SettingsPage />;
    }

    return null;
  };

  if (!mounted) return null;

  return (
    <SettingsProvider>
      <AuthProvider initialSession={initialSession} initialRole={initialRole}>
        <SubscriptionProvider>
          <CustomerProvider>
            <AppContent
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              status={status}
              message={message}
              logs={logs}
              allRecords={allRecords}
              data={data}
              stores={stores}
              selectedStore={selectedStore}
              setSelectedStore={setSelectedStore}
              handleFileUpload={handleFileUpload}
              handleSyncVMPay={handleSyncVMPay}
              handleForceSync={handleForceSync}
              renderContent={renderContent}
              stableInitialLoad={stableInitialLoad}
            />
          </CustomerProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
