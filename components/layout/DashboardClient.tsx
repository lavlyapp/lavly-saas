"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  renderContent
}: any) {
  const { selectedCustomerName, closeCustomerDetails } = useCustomerContext();
  const { isAuthenticated, isLoading } = useAuth();
  const [showTerms, setShowTerms] = useState(false);

  // Derive profile on the fly when selected (Global Modal Logic)
  const selectedProfile = useMemo(() => {
    if (!selectedCustomerName || !allRecords) return null;
    return getProfile(selectedCustomerName, allRecords);
  }, [selectedCustomerName, allRecords]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
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
              onClick={handleSyncVMPay}
              disabled={status === 'uploading'}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                status === 'uploading' ? "bg-neutral-800 text-neutral-400" : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", status === 'uploading' && "animate-spin")} />
              {status === 'uploading' ? 'Sincronizando...' : 'Sync VMPay'}
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

            {/* Content Area with Forced Remount on View Change */}
            <div key={`${activeTab}-${status}-${allRecords.length}-${data ? 'hasData' : 'noData'}`}>
              {renderContent()}
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

export default function DashboardClient({ initialSession }: { initialSession?: any }) {
  const [activeTab, setActiveTab] = useState("financial");
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<string[]>([]); // Debug Logs

  // Data States
  const [allRecords, setAllRecords] = useState<SaleRecord[]>([]);
  const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);
  const [data, setData] = useState<any>(null);

  // Filter States
  const [dbStores, setDbStores] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  // Compute available stores from both DB and Data
  const stores = useMemo(() => {
    const dataStores = Array.from(new Set(allRecords.map(r => getCanonicalStoreName(r.loja))));
    const combined = Array.from(new Set([...dbStores, ...dataStores])).filter(Boolean).sort();
    return combined;
  }, [allRecords, dbStores]);

  // Hydration Fix
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isInitializing = useRef(false);

  useEffect(() => {
    async function loadHistory() {
      if (!mounted || isInitializing.current) return;
      isInitializing.current = true;

      console.log("[Home] Initializing app data...");
      setLogs(prev => [...prev, "[System] Iniciando carregamento de dados..."]);

      try {
        // 1. Load active stores first
        setLogs(prev => [...prev, "[System-Debug] 1/4 Importando vmpay-config..."]);
        const { getVMPayCredentials, getCanonicalStoreName } = await import("@/lib/vmpay-config");
        setLogs(prev => [...prev, "[System-Debug] 2/4 Buscando credenciais VMPay..."]);
        const activeStores = await getVMPayCredentials();
        const configuredNames = activeStores.map(s => getCanonicalStoreName(s.name));

        let initialStore = selectedStore;
        if (!selectedStore) {
          initialStore = 'Todas';
          setSelectedStore(initialStore);
        }

        // 2. Load history from Supabase
        setLogs(prev => [...prev, "[System-Debug] 3/4 Importando persistence.ts..."]);
        const { fetchSalesHistory } = await import("@/lib/persistence");
        setLogs(prev => [...prev, "[System-Debug] 4/4 Aguardando fetchSalesHistory() (Banco de Dados)..."]);
        const { sales, orders } = await fetchSalesHistory();

        // Normalize names from DB just in case SQL migration wasn't 100% or cache exists
        const normalizedSales = sales.map(s => ({ ...s, loja: getCanonicalStoreName(s.loja) }));
        const normalizedOrders = orders.map(o => ({ ...o, loja: getCanonicalStoreName(o.loja) }));

        console.log(`[Home] History loaded: ${sales.length} sales, ${orders.length} orders`);

        // 3. Process and Update State
        setDbStores(configuredNames);

        if (sales.length > 0) {
          setAllRecords(normalizedSales);
          setAllOrders(normalizedOrders);
          setLogs(prev => [...prev, `[System] ${sales.length} registros carregados conforme histórico.`]);
        } else {
          setLogs(prev => [...prev, "[System] Nenhum histórico encontrado. Aguardando novos dados."]);
        }
      } catch (err) {
        console.error("[Home] Error during initialization:", err);
        setLogs(prev => [...prev, `[Erro] Falha crítica ao carregar dados: ${(err as any).message}`]);
        setStatus("error");
        setMessage("Erro ao carregar dados do Supabase. Verifique sua conexão.");
      } finally {
        isInitializing.current = false;
      }
    }
    loadHistory();
  }, [mounted]);

  // Logic: Re-calculate 'data' (View) when 'allRecords', 'allOrders' or 'selectedStore' changes
  useEffect(() => {
    if (!mounted || allRecords.length === 0) {
      setData(null);
      return;
    }

    console.time("[Page] calculate ViewData");

    // 1. Filter Records & Orders
    const filteredRecords = (!selectedStore || selectedStore === 'Todas')
      ? allRecords
      : allRecords.filter((r, idx) => {
        const rLoja = getCanonicalStoreName(r.loja);
        const sLoja = getCanonicalStoreName(selectedStore);
        const match = rLoja === sLoja;

        // Log first 5 attempts to understand mismatch
        if (idx < 5) {
          console.log(`[Filter] Row ${idx}: DB="${r.loja}"(Can:${rLoja}) vs Selected="${selectedStore}"(Can:${sLoja}) Match:${match}`);
        }
        return match;
      });

    const filteredOrders = (!selectedStore || selectedStore === 'Todas')
      ? allOrders
      : allOrders.filter(o => {
        const oLoja = getCanonicalStoreName(o.loja);
        const sLoja = getCanonicalStoreName(selectedStore);
        return oLoja === sLoja;
      });

    if (selectedStore && filteredRecords.length === 0 && allRecords.length > 0) {
      const available = Array.from(new Set(allRecords.map(r => r.loja)));
      const canonicalAvailable = Array.from(new Set(available.map(a => getCanonicalStoreName(a))));

      console.warn(`[Page] Filter returned 0 results for ${selectedStore}. Available store names:`, available);
      setLogs(prev => [
        ...prev,
        `[DEBUG] Filtro ZERO para "${selectedStore}" (Canônico: "${getCanonicalStoreName(selectedStore)}")`,
        `[DEBUG] Lojas no Estado: ${available.join(', ')}`,
        `[DEBUG] Lojas Canônicas: ${canonicalAvailable.join(', ')}`
      ]);
    }

    // 2. Recalculate Summary for View
    const totalSales = filteredRecords.length;
    const totalValue = filteredRecords.reduce((acc, r) => acc + r.valor, 0);

    const sorted = [...filteredRecords].sort((a, b) => {
      const timeA = a.data instanceof Date ? a.data.getTime() : new Date(a.data).getTime();
      const timeB = b.data instanceof Date ? b.data.getTime() : new Date(b.data).getTime();
      return timeA - timeB;
    });

    // Expose for console debugging
    if (typeof window !== 'undefined') {
      (window as any).DEBUG_RECORDS = allRecords;
      (window as any).DEBUG_SELECTED = selectedStore;
      (window as any).DEBUG_FILTERED = filteredRecords;
    }

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

    setData(viewData);
    console.timeEnd("[Page] calculate ViewData");
  }, [allRecords, allOrders, selectedStore, mounted]);

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
        setAllOrders(mergedOrders.map((o: any) => ({ ...o, loja: getCanonicalStoreName(o.loja) })));
        setAllRecords(newRecords.map((r: any) => ({ ...r, loja: getCanonicalStoreName(r.loja) })));

        setLogs(prev => [...prev, ...etlLogs, `[DEBUG] Loop Complete. Linked ${enrichedCount} sales.`]);
        setMessage(`Sucesso! Pedidos importados e ${enrichedCount} vínculos criados.`);
        setStatus("success");

        // LOGIC CHANGE: Only set message based on newly added items?
        // Actually, mergedOrders handles the state.
        // We calculate if new items were added roughly by size invalidation or just assume success logic.

        setLogs(prev => [...prev, ...etlLogs]);

        const addedCount = mergedOrders.length - allOrders.length;
        if (addedCount > 0) {
          setMessage(`Sucesso! ${addedCount} novos pedidos adicionados via Fusão. ${enrichedCount} vínculos criados.`);
          setStatus("success");
        } else if (enrichedCount > 0) {
          setMessage(`Sucesso! Pedidos atualizados, ${enrichedCount} novos vínculos criados.`);
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

  async function handleSyncVMPay() {
    setStatus("uploading");
    setMessage("Sincronizando dados com VMPay... (Isso pode demorar alguns segundos)");
    setLogs(prev => [...prev, "[VMPay] Iniciando sincronização via API..."]);

    try {
      // Fetch current session for auth token
      const { supabase } = await import("@/lib/supabase");
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      // Force full sync (180 days) if dashboard is completely empty
      const isFirstSync = allRecords.length === 0;
      const url = isFirstSync ? "/api/vmpay/sync?source=manual&force=true" : "/api/vmpay/sync?source=manual";

      // Set an abort controller to prevent infinite freeze if Vercel drops connection without 50x
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000); // Vercel times out at 60s max, we abort slightly before

      const res = await fetch(url, {
        method: "GET",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Robust check for Vercel 504 timeouts (HTML instead of JSON)
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textStr = await res.text();
        throw new Error(`A sincronização demorou muito e o servidor (Vercel) encerrou a conexão (Timeout). Tente atualizar a página ou sincronizar uma loja por vez. Resposta bruta: ${textStr.substring(0, 50)}...`);
      }

      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || `HTTP ${res.status}`);

      // --- CUSTOMERS SYNC ---
      if (result.customers && Array.isArray(result.customers)) {
        const customers = result.customers.map((c: any) => ({
          ...c,
          registrationDate: c.registrationDate ? new Date(c.registrationDate) : undefined
        }));
        setAllCustomers(customers);
        setLogs(prev => [...prev, `[VMPay] ${customers.length} clientes sincronizados.`]);
      }

      // Convert date strings back to Date objects
      const rawRecords = result.records || [];
      const totalToProcess = rawRecords.length;
      const CHUNK_SIZE = 500;

      setLogs(prev => [...prev, `[VMPay] Iniciando processamento de ${totalToProcess} registros em blocos...`]);

      for (let i = 0; i < totalToProcess; i += CHUNK_SIZE) {
        const chunk = rawRecords.slice(i, i + CHUNK_SIZE);

        // Update Message
        const pct = Math.round((i / totalToProcess) * 100);
        setMessage(`Processando novos dados... ${pct}% (${i}/${totalToProcess})`);

        // Convert dates for this chunk
        const processedChunk = chunk.map((r: any) => ({
          ...r,
          data: new Date(r.data),
          loja: getCanonicalStoreName(r.loja), // Normalização aqui!
          items: r.items?.map((i: any) => ({
            ...i,
            startTime: i.startTime ? new Date(i.startTime) : null
          })) || []
        }));

        // Extract Synthetic Orders
        const chunkOrders: OrderRecord[] = processedChunk.flatMap((sale: any) =>
          (sale.items || []).map((item: any) => ({
            data: item.startTime || sale.data,
            loja: sale.loja,
            cliente: sale.cliente,
            machine: item.machine,
            service: item.service,
            status: item.status,
            valor: item.value
          }))
        );

        // Update Global States in batches
        setAllOrders(prev => mergeOrders(prev, chunkOrders));
        setAllRecords(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const uniqueNew = processedChunk.filter((r: any) => !existingIds.has(r.id));
          return [...prev, ...uniqueNew];
        });

        // Yield to browser
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const newCount = totalToProcess;
      const custCount = result.customers?.length || 0;
      setLogs(prev => [...prev, `[VMPay] Sincronização concluída. ${newCount} vendas, ${custCount} clientes.`]);
      setMessage(`Sincronização VMPay concluída! ${newCount} vendas, ${custCount} clientes.`);
      setStatus("success");

    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setMessage(`Erro na sincronização: ${e.message}`);
      setLogs(prev => [...prev, `[VMPay Error] ${e.message}`]);
    }
  }

  // Content Rendering Logic
  const renderContent = () => {
    // 1. Strict Mount Check (Hydration Fix)
    if (!mounted) return null;

    if (activeTab === 'logs') {
      return <ActivityLogs />;
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
              onClick={handleSyncVMPay}
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
      <AuthProvider initialSession={initialSession}>
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
              renderContent={renderContent}
            />
          </CustomerProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
