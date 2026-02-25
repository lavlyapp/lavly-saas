"use client";

import { useState, useEffect, useMemo } from "react";
import { Upload, FileUp, CheckCircle, AlertCircle, Building2, Filter, RefreshCw, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { StoreSelector } from "@/components/layout/StoreSelector";
import dynamic from 'next/dynamic';
import { SaleRecord, OrderRecord, CustomerRecord } from "@/lib/processing/etl";
import { CustomerProvider, useCustomerContext } from "@/components/context/CustomerContext";
import { getProfile } from "@/lib/processing/crm";
import { CustomerDetails } from "@/components/modules/CustomerDetails";
import { CustomerDemographics } from "@/components/modules/CustomerDemographics"; // New
import { mergeOrders } from "@/lib/processing/merger";
import { SubscriptionProvider } from "@/components/context/SubscriptionContext";
import { SettingsProvider } from "@/components/context/SettingsContext";
import { calculateCrmMetrics } from "@/lib/processing/crm"; // New
import { AuthProvider, useAuth } from "@/components/context/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { TermsOfUse } from "@/components/modules/TermsOfUse";

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

export default function Home() {
  const [activeTab, setActiveTab] = useState("financial");
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<string[]>([]); // Debug Logs

  // Data States
  const [allRecords, setAllRecords] = useState<SaleRecord[]>([]);
  const [allOrders, setAllOrders] = useState<OrderRecord[]>([]); // New: Separate Orders State
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]); // New: Customer Registry State
  const [data, setData] = useState<any>(null); // View Data (Filtered)

  // Hydration Fix: Ensure component only renders on client
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter States
  const [stores, setStores] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);


  // Logic: Re-calculate 'data' (View) when 'allRecords' or 'selectedStore' changes
  useEffect(() => {
    if (allRecords.length === 0) {
      setData(null);
      return;
    }

    // 1. Filter Records
    const filteredRecords = !selectedStore
      ? allRecords
      : allRecords.filter(r => r.loja === selectedStore);

    // 1b. Filter Orders
    const filteredOrders = !selectedStore
      ? allOrders
      : allOrders.filter(o => o.loja === selectedStore);

    // 2. Recalculate Summary for View
    const totalSales = filteredRecords.length;
    const totalValue = filteredRecords.reduce((acc, r) => acc + r.valor, 0);
    const sorted = [...filteredRecords].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    const viewData = {
      records: filteredRecords,
      orders: filteredOrders, // Pass to View
      summary: {
        totalSales,
        totalValue,
        startDate: sorted.length > 0 ? sorted[0].data : null,
        endDate: sorted.length > 0 ? sorted[sorted.length - 1].data : null
      },
      errors: [],
      logs: logs // Pass logs to view
    };

    setData(viewData);

    // 3. Update Stores List (Unique)
    const uniqueStores = Array.from(new Set(allRecords.map(r => r.loja))).sort();
    setStores(uniqueStores);

  }, [allRecords, selectedStore, logs]);

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
        const orders = result.records.map((r: any) => ({ ...r, data: new Date(r.data) }));

        // Deduplicate using fuzzy logic
        const mergedOrders = mergeOrders(allOrders, orders);
        setAllOrders(mergedOrders);

        // --- ENRICHMENT LOGIC (Existing Sales Linking) ---
        let enrichedCount = 0;
        const etlLogs = result.logs || [];
        etlLogs.push(`[MERGE] Merging ${orders.length} new orders into ${allOrders.length} existing using Fuzzy Logic.`);
        // Create a new array from current records
        const newRecords = [...allRecords];

        // --- PERFORMANCE OPTIMIZATION ---
        setLogs(prev => [...prev, "[DEBUG] Starting Sales Indexing..."]);

        // 1. Create a Date-based Index for Sales
        // Map Key: YYYY-MM-DD -> Value: Array of SaleRecords on that day
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
            console.error("Invalid sale date:", sale);
          }
        });

        setLogs(prev => [...prev, `[DEBUG] Sales Indexed: ${validSales} valid, ${invalidSales} invalid.`]);

        // 1b. Sort Sales in each day by Time (Ascending) for Binary Search Window
        salesByDay.forEach((daySales) => {
          daySales.sort((a, b) => a.data.getTime() - b.data.getTime());
        });

        // Helper for normalization with cache
        const normCache = new Map<string, string>();
        const normalizeStr = (str: string) => {
          if (!str) return '';
          if (normCache.has(str)) return normCache.get(str)!;
          let res = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          res = res.replace(/vendas|pedidos|relatorio/g, '').trim(); // Pre-clean store name noise
          normCache.set(str, res);
          return res;
        };

        // Pre-calculate Store Logic
        const uniqueStoreCount = new Set(newRecords.map(r => r.loja)).size;
        const isMultiStore = uniqueStoreCount > 1;

        // --- PRE-COMPUTATION OPTIMIZATION ---
        // Pre-normalize sale properties once to avoid O(N*M) heavy string operations in the loop
        salesByDay.forEach(daySales => {
          daySales.forEach(sale => {
            sale._time = sale.data.getTime();
            sale._nLoja = isMultiStore ? normalizeStr(sale.loja) : '';
            sale._nCli = sale.cliente && sale.cliente !== 'Consumidor Final' ? normalizeStr(sale.cliente) : '';
            sale._nCliFirst = sale._nCli ? sale._nCli.split(' ')[0] : '';
          });
        });

        // Message to indicate processing start
        setMessage(`Processando ${orders.length} pedidos. Iniciando cruzamento de dados...`);
        setLogs(prev => [...prev, `[DEBUG] Starting enrichment loop for ${orders.length} orders.`]);

        // BUFFER FOR ERRORS TO PREVENT UI FREEZE
        let errorCount = 0;
        const MAX_ERRORS = 50;
        const loopErrors: string[] = [];

        // --- ASYNC CHUNKING LOOP ---
        const CHUNK_SIZE = 1000; // Increased massively since inner loop is now ~O(log N) + tiny linear search

        for (let i = 0; i < orders.length; i += CHUNK_SIZE) {
          const chunk = orders.slice(i, i + CHUNK_SIZE);

          // Update Progress
          const pct = Math.round((i / orders.length) * 100);
          setMessage(`Processando pedidos... ${pct}% concluído.`);
          if (i === 0 || i % 10000 === 0) setLogs(prev => [...prev, `[DEBUG] Loop Progress: ${pct}%`]);

          // Yield to render via microtask
          await new Promise(resolve => setTimeout(resolve, 0));

          chunk.forEach((order: any) => {
            try {
              if (!order.data || isNaN(order.data.getTime())) return;

              let orderDateKey: string;
              try {
                orderDateKey = order.data.toISOString().split('T')[0];
              } catch (e) { return; }

              const allDayMatches = salesByDay.get(orderDateKey);
              if (!allDayMatches || allDayMatches.length === 0) return;

              // Optimization: Window Search
              const orderTime = order.data.getTime();
              const minTime = orderTime - 7200000; // -2h
              const maxTime = orderTime + 7200000; // +2h

              let bestMatch: any = null;
              let minTimeDiff = Infinity;

              const oStore = isMultiStore ? normalizeStr(order.loja) : '';
              const oCli = order.cliente && order.cliente !== 'Consumidor Final' ? normalizeStr(order.cliente) : '';
              const oFirst = oCli ? oCli.split(' ')[0] : '';

              // Optimization: Binary Search for minTime instead of Linear Scan
              let left = 0;
              let right = allDayMatches.length - 1;
              let startIndex = 0;
              while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                if (allDayMatches[mid]._time >= minTime) {
                  startIndex = mid;
                  right = mid - 1;
                } else {
                  left = mid + 1;
                }
              }

              // Linear Scan on Sorted List starting strictly from startIndex with early exit
              for (let j = startIndex; j < allDayMatches.length; j++) {
                const sale = allDayMatches[j];
                const saleTime = sale._time;

                // Break if too late (sorted list!)
                if (saleTime > maxTime) break;

                // 1. Store Matching
                if (isMultiStore) {
                  const sStore = sale._nLoja;
                  const nameMatch = sStore.includes(oStore) || oStore.includes(sStore) || sStore === oStore;

                  if (!nameMatch && sStore !== "" && oStore !== "") continue;
                }

                // 2. Client Matching
                if (sale._nCli && oCli) {
                  const sCli = sale._nCli;
                  if (sale._nCliFirst !== oFirst && (!sCli.includes(oCli) && !oCli.includes(sCli))) continue;
                }

                // 3. Time Matching
                const timeDiff = Math.abs(saleTime - orderTime);
                if (timeDiff < minTimeDiff) {
                  minTimeDiff = timeDiff;
                  bestMatch = sale;
                }
              }

              if (bestMatch) {
                if (!bestMatch.items) bestMatch.items = [];

                // Use Fuzzy Check for linking as well to avoid duplicate items in the Sale Record
                const exists = (bestMatch.items || []).some((i: any) => {
                  if (!i.startTime) return false;
                  const iTime = i.startTime instanceof Date ? i.startTime.getTime() : new Date(i.startTime).getTime();
                  return i.machine === order.machine && Math.abs(iTime - order.data.getTime()) < 300000;
                });

                if (!exists) {
                  if (!bestMatch.items) bestMatch.items = [];
                  bestMatch.items.push({
                    machine: order.machine,
                    service: order.service,
                    status: order.status,
                    startTime: order.data,
                    value: order.valor
                  });
                  enrichedCount++;
                }

                // Transfer Demographics if available
                if (order.birthDate && !bestMatch.birthDate) {
                  bestMatch.birthDate = order.birthDate;
                  bestMatch.age = order.age;
                }
              }
            } catch (error: any) {
              if (errorCount < MAX_ERRORS) {
                loopErrors.push(`[ERROR] Matching failed for order: ${error.message}`);
                errorCount++;
              }
            }
          });
        }

        if (loopErrors.length > 0) {
          setLogs(prev => [...prev, ...loopErrors, `[SYSTEM] Suppressed further errors to maintain performance.`]);
        }
        setLogs(prev => [...prev, `[DEBUG] Enrichment Loop Complete. Added ${enrichedCount} links.`]);

        // Update State
        setAllRecords(newRecords);

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
        setMessage(`Sucesso! ${customers.length} clientes importados. O CRM será atualizado.`);
        setStatus("success");
        if (result.logs) setLogs(prev => [...prev, ...result.logs]);

      } else {
        // --- SALES MERGE STRATEGY ---
        const newRecords = result.records.map((r: any) => ({
          ...r,
          data: new Date(r.data),
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
      // Default sync: last 30 days (handled by API if no params)
      const res = await fetch("/api/vmpay/sync?source=manual");
      const result = await res.json();

      if (!result.success) throw new Error(result.error);

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
      const newRecords = result.records.map((r: any) => ({
        ...r,
        data: new Date(r.data),
        items: r.items?.map((i: any) => ({
          ...i,
          startTime: i.startTime ? new Date(i.startTime) : null
        })) || []
      }));

      // Extract Orders from Sales (Synthetic Orders for Metrics)
      const syntheticOrders: OrderRecord[] = newRecords.flatMap((sale: any) =>
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

      // --- FUZZY MERGE ---
      // This solves duplication by merging API orders with existing Excel orders (or vice-versa)
      const mergedOrders = mergeOrders(allOrders, syntheticOrders);
      setAllOrders(mergedOrders);

      setAllRecords(prev => {
        // Deduplicate by ID
        const existingIds = new Set(prev.map(r => r.id));
        const uniqueNew = newRecords.filter((r: any) => !existingIds.has(r.id));

        if (uniqueNew.length === 0) return prev;

        // If we have new records, we might want to sort them?
        // The useEffect refilters and sorts anyway.
        return [...prev, ...uniqueNew];
      });

      const newCount = newRecords.length;
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
      return <CrmDashboard data={data} customers={allCustomers} />;
    }

    if (activeTab === 'churn' && data && data.records.length > 0) {
      return <ChurnAnalysis data={data} />;
    }

    if (activeTab === 'machines' && data) {
      return <MachineAnalysis data={data} />;
    }

    if (activeTab === 'queue' && data) {
      return <QueueAnalysis data={data.records} />;
    }

    if (activeTab === 'queue' && data) {
      return <QueueAnalysis data={data.records} />;
    }

    if (activeTab === 'demographics' && data) {
      return <CustomerDemographics records={data.records} customers={allCustomers} />;
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

  return (
    <SettingsProvider>
      <AuthProvider>
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
