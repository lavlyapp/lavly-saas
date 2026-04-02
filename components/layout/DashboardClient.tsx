"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  FileUp, Calendar, AlertCircle, RefreshCw, LogOut,
  Moon, Sun, MapPin, Briefcase, FileText, Download, CheckCircle, Upload, Menu,
  ChevronDown, ChevronUp // Added toggle icons
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { StoreSelector } from "@/components/layout/StoreSelector";
import dynamic from 'next/dynamic';
import { SaleRecord, OrderRecord, CustomerRecord } from "@/lib/processing/etl";
import { CustomerProvider, useCustomerContext } from "@/components/context/CustomerContext";
import { getProfile } from "@/lib/processing/crm";
import { CustomerDetails } from "@/components/modules/CustomerDetails";
// Cache offline IndexedDB Removido. A plataforma agora é 100% Nuvem.
import { getVMPayCredentials, getCanonicalStoreName } from "@/lib/vmpay-config";
import { mergeOrders } from "@/lib/processing/merger";
import { SubscriptionProvider } from "@/components/context/SubscriptionContext";
import { SettingsProvider } from "@/components/context/SettingsContext";
import { calculateCrmMetrics } from "@/lib/processing/crm"; // New
import { AuthProvider, useAuth } from "@/components/context/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { TermsOfUse } from "@/components/modules/TermsOfUse";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { OnboardingCnpj } from "@/components/modules/OnboardingCnpj";
import { OnboardingVMPay } from "@/components/modules/OnboardingVMPay";
import { OnboardingPassword } from "@/components/modules/OnboardingPassword";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { LavlyAdminDashboard } from "@/components/modules/LavlyAdminDashboard";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null, errorInfo: ErrorInfo | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("DashboardClient ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-4 bg-red-950/50 border border-red-500/50 rounded-xl text-white">
          <h2 className="text-xl font-bold text-red-500 flex items-center gap-2 mb-4">
            <AlertCircle className="w-6 h-6" />
            Fatal Component Crash
          </h2>
          <div className="bg-black/50 p-4 rounded-lg overflow-auto text-xs font-mono text-neutral-300">
            <p className="text-red-400 font-bold mb-2">{this.state.error && this.state.error.toString()}</p>
            <pre className="whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-500 rounded font-bold text-sm"
          >
            Tentar Renderizar Novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Dynamically import CrmDashboard with SSR disabled to prevent hydration errors
const CrmDashboard = dynamic(
  () => import('@/components/modules/CrmDashboard').then(mod => mod.CrmDashboard),
  { ssr: false, loading: () => <p className="text-neutral-500 p-4">Carregando...</p> }
);

// Dynamically import FinancialDashboard with SSR disabled to prevent hydration errors (Recharts)
const FinancialDashboard = dynamic(
  () => import('@/components/modules/FinancialDashboard').then(mod => mod.FinancialDashboard),
  { ssr: false, loading: () => <p className="text-neutral-500 p-4">Carregando...</p> }
);

const ComparativeDashboard = dynamic(
  () => import('@/components/modules/ComparativeDashboard').then(mod => mod.ComparativeDashboard),
  { ssr: false, loading: () => <p className="text-neutral-500 p-4">Carregando...</p> }
);

// Dynamically import ChurnAnalysis
const ChurnAnalysis = dynamic(
  () => import('@/components/modules/ChurnAnalysis').then(mod => mod.ChurnAnalysis),
  { ssr: false, loading: () => <p className="text-neutral-500 p-4">Carregando...</p> }
);

const MachineAnalysis = dynamic(
  () => import('@/components/modules/MachineAnalysis').then(mod => mod.MachineAnalysis),
  { ssr: false, loading: () => <p className="text-neutral-500 p-4">Carregando...</p> }
);

const Reports = dynamic<any>(
  () => import('@/components/modules/Reports').then(mod => mod.Reports),
  { ssr: false, loading: () => <p className="text-neutral-500 p-4">Carregando...</p> }
);

const QueueAnalysis = dynamic(
  () => import('@/components/modules/QueueAnalysis').then(mod => mod.QueueAnalysis),
  { ssr: false, loading: () => <p className="text-neutral-500 p-4">Carregando...</p> }
);

const CouponManager = dynamic(
  () => import('@/components/modules/CouponManager').then(mod => mod.CouponManager),
  { ssr: false, loading: () => <p className="text-neutral-500 p-4">Carregando...</p> }
);

const SettingsPage = dynamic(
  () => import('@/components/modules/SettingsPage').then(mod => mod.SettingsPage),
  { ssr: false, loading: () => <p className="text-neutral-500 p-4">Carregando...</p> }
);

const ActivityLogs = dynamic<any>(
  () => import('@/components/modules/ActivityLogs').then(mod => mod.ActivityLogs),
  { ssr: false, loading: () => <p className="text-neutral-500 p-4">Carregando...</p> }
);

const CustomerDemographics = dynamic<any>(
  () => import('@/components/modules/CustomerDemographics').then(mod => mod.CustomerDemographics),
  { ssr: false, loading: () => <p className="text-neutral-500 p-4">Carregando...</p> }
);



// Define AppContent Props explicitly for the extracted component to maintain type safety
interface AppContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  status: "idle" | "uploading" | "success" | "error";
  setStatus: (status: "idle" | "uploading" | "success" | "error") => void;
  message: string;
  setMessage: (msg: string) => void;
  logs: string[];
  allRecords: SaleRecord[];
  allCustomers: CustomerRecord[];
  data: any;
  stores: string[];
  allOrders: OrderRecord[];
  selectedStore: string | null;
  setSelectedStore: (store: string | null) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSyncVMPay: (token: string | null) => Promise<void>;

  stableInitialLoad: (token: string | null) => void;
  stableFullRefresh: (token: string | null) => void;
  syncProgress: number;
}

function AppContent({
  activeTab,
  setActiveTab,
  status,
  setStatus,
  message,
  setMessage,
  logs,
  allRecords,
  allCustomers,
  data: viewData,
  stores,
  allOrders,
  selectedStore,
  setSelectedStore,
  handleFileUpload,
  handleSyncVMPay,

  stableInitialLoad,
  stableFullRefresh,
  syncProgress
}: AppContentProps) {
  // Last Update Timestamp
  const [renderTime, setRenderTime] = useState("");
  useEffect(() => {
    if (allRecords && allRecords.length > 0) setRenderTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  }, [allRecords]);

  const { selectedCustomerName, closeCustomerDetails } = useCustomerContext();
  const { user, isAuthenticated, isLoading, token, isExpired, role, vmpayApiKey } = useAuth();
  const [showTerms, setShowTerms] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(false);
  const hasLoaded = useRef(false);

  // UI States that must be defined before early returns
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    return getProfile(selectedCustomerName, allRecords, allOrders);
  }, [selectedCustomerName, allRecords, allOrders]);

  // Content Rendering Logic
  const renderContent = (token: string | null = null) => {
    // 1. Strict Mount Check (Hydration Fix)
    if (!mounted) return null;

    if (activeTab === 'admin') {
      return <LavlyAdminDashboard />;
    }

    if (activeTab === 'logs') {
      return <ActivityLogs />;
    }

    // 2. Initial Loading State (Fix for blank screen "not loading normally")
    const isActivelyLoading = status === 'uploading' || (logs.length > 0 && status !== 'error' && status !== 'success');
    if (isActivelyLoading && allRecords.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 h-[60vh] w-full bg-neutral-900/50 rounded-3xl border border-neutral-800 animate-in fade-in duration-500">
          <div className="flex flex-col items-center gap-6 w-full max-w-md">

            {/* Visual Header */}
            <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]" />

            <div className="text-center w-full">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent mb-2">
                Conectando ao VMPay...
              </h3>
              <p className="text-sm font-medium text-emerald-100/70 mb-6 font-mono tracking-tight">
                {message || "Sincronizando banco de dados"}
              </p>

              {/* Sync Progress Bar */}
              {syncProgress > 0 && (
                <div className="w-full h-3 bg-neutral-950 border border-neutral-800 rounded-full overflow-hidden shadow-inner mb-2 relative">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out flex items-center justify-end pr-2"
                    style={{ width: `${syncProgress}%` }}
                  >
                    <div className="w-6 h-full bg-white/20 -skew-x-12 animate-[shimmer_1s_infinite]" />
                  </div>
                </div>
              )}
              {syncProgress > 0 && (
                <p className="text-right text-[10px] text-neutral-500 font-bold tracking-wider">{syncProgress}% CONCLUÍDO</p>
              )}
            </div>
          </div>

          <div className="mt-8 max-w-md w-full">
            <div className="bg-black/60 rounded-xl p-4 border border-white/5 font-mono text-[10px] text-emerald-500/50 h-32 overflow-y-auto custom-scrollbar shadow-inner">
              {logs.slice(-5).map((log, i) => (
                <div key={i} className="mb-2 truncate">
                  <span className="text-emerald-500 mr-2 opacity-70">&gt;</span>{log}
                </div>
              ))}
            </div>
          </div>
        </div >
      );
    }

    // Default or No Data State
    if (!viewData && status !== 'uploading' && allRecords.length === 0) {
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
    if (activeTab === 'financial' && viewData) {
      return <FinancialDashboard data={viewData} selectedStore={selectedStore || undefined} />;
    }

    if (activeTab === 'comparative' && viewData) {
      return <ComparativeDashboard data={viewData} customers={allCustomers} selectedStore={selectedStore || undefined} />;
    }

    if (activeTab === 'crm' && viewData) {
      return <CrmDashboard data={viewData} customers={allCustomers} selectedStore={selectedStore || undefined} />;
    }

    if (activeTab === 'churn' && viewData && viewData.records.length > 0) {
      return <ChurnAnalysis data={viewData} selectedStore={selectedStore || undefined} />;
    }

    if (activeTab === 'machines' && viewData) {
      return <MachineAnalysis data={viewData} selectedStore={selectedStore || undefined} />;
    }

    if (activeTab === 'queue' && viewData) {
      return <QueueAnalysis data={viewData.records} selectedStore={selectedStore || undefined} />;
    }

    if (activeTab === 'demographics' && viewData) {
      return <CustomerDemographics records={viewData.records} customers={allCustomers} selectedStore={selectedStore || undefined} orders={viewData.orders} />;
    }

    if (activeTab === 'reports') {
      if (!viewData?.records) return <div className="p-8 text-neutral-500 text-center">Nenhum dado processado para gerar relatórios.</div>;
      return <Reports data={viewData} />;
    }

    if (activeTab === 'marketing') {
      return <CouponManager />;
    }

    if (activeTab === 'settings') {
      return <SettingsPage />;
    }

    // Default Fallback inside AppContent if no tab matches or data is missing
    return (
      <div className="flex flex-col items-center justify-center p-8 h-[60vh] w-full bg-neutral-900/50 rounded-3xl border border-neutral-800 animate-in fade-in">
        <h2 className="text-xl font-bold text-neutral-400 mb-2">Painel Indisponível</h2>
        <p className="text-sm text-neutral-500">
          {activeTab === 'settings' || activeTab === 'logs' || activeTab === 'marketing'
            ? "Carregando módulo..."
            : "Não há dados suficientes para exibir este painel. Verifique se a importação foi concluída ou se a loja possui vendas."}
        </p>
      </div>
    );
  };

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

  // Password Change Onboarding - Highest Priority
  if (user?.user_metadata?.force_password_change) {
    return <OnboardingPassword onSuccess={() => window.location.reload()} />;
  }

  // VMPay Onboarding Block - Strict Enforcement
  if (role && role !== 'admin' && !vmpayApiKey) {
    return <OnboardingVMPay onSuccess={() => window.location.reload()} />;
  }

  // Moved states to the top to respect React's hook ordering rules.

  return (
    <div className="flex min-h-screen bg-neutral-950 font-sans text-neutral-100">

      {/* Sidebar */}
      <AppSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden overflow-y-auto w-full max-w-[100vw]">

        {/* Top Header */}
        <header className="border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-md p-4 md:p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 z-10 sticky top-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
            <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
              <button
                className="md:hidden p-2 -ml-2 rounded-lg hover:bg-neutral-800 text-neutral-400 shrink-0"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-bold bg-white bg-clip-text text-transparent truncate">
                  {activeTab === 'financial' && 'Visão Financeira'}
                  {activeTab === 'comparative' && 'Financeiro Comparativo'}
                  {activeTab === 'crm' && 'Gestão de Clientes'}
                  {activeTab === 'churn' && 'Análise de Churn & Retenção'}
                  {activeTab === 'machines' && 'Parque de Máquinas'}
                  {activeTab === 'logs' && 'Auditoria de Sistema'}
                </h2>
                <div className="flex items-center gap-2">
                  <p className="text-xs md:text-sm text-neutral-500 truncate">
                    {allRecords.length > 0
                      ? `${allRecords.length} vendas | ${stores.length} lojas`
                      : 'Aguardando importação...'}
                  </p>
                  {renderTime && (
                    <p className="text-[11px] text-neutral-400 font-mono border-l border-neutral-800 pl-2">
                      {renderTime}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* STORE SELECTOR */}
            <div className="w-full sm:w-auto shrink-0 z-50">
              <StoreSelector
                stores={stores}
                selectedStore={selectedStore}
                onSelectStore={setSelectedStore}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">


            <button
              onClick={() => handleSyncVMPay(token)}
              disabled={status === 'uploading'}
              title="Sincronizar dados de Vendas e Demografia agora"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative overflow-hidden",
                status === 'uploading' ? "bg-neutral-800 text-neutral-400" : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
              )}
            >
              {/* Inline Button Progress Fill */}
              {status === 'uploading' && syncProgress > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-500/20 transition-all duration-300"
                  style={{ width: `${syncProgress}%` }}
                />
              )}

              <RefreshCw className={cn("w-4 h-4 relative z-10", status === 'uploading' && "animate-spin")} />
              <span className="relative z-10">{status === 'uploading' ? 'Sincronizando...' : 'Sync VMPay'}</span>
            </button>



            <button
              onClick={() => stableFullRefresh(token)}
              title="Recarregar base de dados completa (Ignorar Cache)"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-neutral-800 hover:bg-neutral-700 text-white shadow-lg transition-all"
            >
              <RefreshCw className={cn("w-4 h-4", status === 'uploading' && "animate-spin")} />
              <span>Atualizar Tela</span>
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

            {/* Content Area - Check for expiration first */}
            {isExpired ? (
              <div className="flex flex-col items-center justify-center p-12 h-[60vh] w-full bg-neutral-900/80 rounded-3xl border border-red-500/30 text-center animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Assinatura Expirada</h2>
                <p className="text-lg text-neutral-400 max-w-lg mx-auto mb-8">
                  Para continuar acessando os serviços de inteligência e os relatórios do Lavly SaaS, por favor renove sua licença com a administração.
                </p>
                <div className="text-sm font-mono text-neutral-500 bg-black/40 px-4 py-2 rounded-lg border border-neutral-800">
                  Acesso Restrito Temporariamente
                </div>
              </div>
            ) : (
              <ErrorBoundary>
                <div key={activeTab}>
                  {renderContent(token)}
                </div>
              </ErrorBoundary>
            )}
          </div>
        </div>
        {/* Debug Logs Section - ALWAYS SHOW IF LOGS EXIST */}
        {logs.length > 0 && (
          <div className="mt-8 p-4 bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-neutral-400">Debug LOG do Sistema</h3>
              <button
                onClick={() => setIsLogsCollapsed(!isLogsCollapsed)}
                className="p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
                title={isLogsCollapsed ? "Expandir Logs" : "Recolher Logs"}
              >
                {isLogsCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            {!isLogsCollapsed && (
              <div className="h-48 overflow-y-auto font-mono text-xs text-neutral-500 bg-black p-2 rounded">
                {logs.map((log: string, i: number) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}
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
        // Let's pass 'viewData?.records' which represents the currently filtered view (e.g. This Month).
        periodRecords={viewData?.records}
      />

      <TermsOfUse
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={() => localStorage.setItem('terms_accepted', 'true')}
      />
    </div>
  );
}

export default function DashboardClient({ initialSession, initialRole, initialExpiresAt, initialLifetimeAccess, initialVmpayApiKey }: { initialSession?: any, initialRole?: any, initialExpiresAt?: string | null, initialLifetimeAccess?: boolean, initialVmpayApiKey?: string | null }) {
  const [activeTab, setActiveTab] = useState("financial");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [syncProgress, setSyncProgress] = useState(0); // Progress Bar (0 to 100)
  const [logs, setRawLogs] = useState<string[]>([]); // Debug Logs
  const setLogs = useCallback((updater: any) => {
    setRawLogs((prev) => {
      const newLogsArgs = typeof updater === 'function' ? updater(prev) : updater;
      if (Array.isArray(newLogsArgs)) {
         const ts = new Date(new Date().getTime() - 3 * 3600 * 1000).toISOString().substring(11, 23);
         return newLogsArgs.map(l => {
             if (typeof l === 'string' && /^\[\d{2}:\d{2}:\d{2}\.\d{3}\]/.test(l)) return l;
             return `[${ts}] ${l}`;
         });
      }
      return newLogsArgs;
    });
  }, []);

  // Data States
  const [allRecords, setAllRecords] = useState<SaleRecord[]>([]);
  const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);
  const [needsOnboardingStores, setNeedsOnboardingStores] = useState<{ name: string }[]>([]);

  // Filter States
  const [dbStores, setDbStores] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
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

    const viewData = useMemo(() => {
    if (!mounted) return null;

    if (allRecords.length === 0 && dbStores.length > 0) {
      return {
        records: [],
        orders: [],
        summary: { totalSales: 0, totalValue: 0, startDate: null, endDate: null },
        errors: [],
        logs: logs
      };
    }

    if (allRecords.length === 0) return null;

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

  const reloadAllData = async (reason: string = "Inicial", authToken: string | null = null, forceFullSync: boolean = false) => {
    if (isInitializing.current) return;
    isInitializing.current = true;

    console.log(`[Home] Reloading all data (Reason: ${reason})...`);
    setStatus("uploading");
    
    try {
      // 1. Create Authenticated Client
      const authenticatedClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${authToken || ''}` } } }
      );

      // 2. Load active stores and config via Secure API (Bypass client DB lock)
      const { getCanonicalStoreName } = await import("@/lib/vmpay-config");
      
      const resStores = await fetch('/api/force-sync/stores');
      const dataStores = await resStores.json();
      const activeStores = dataStores.stores || [];
      const configuredNames = activeStores.map((s: any) => getCanonicalStoreName(s.name));
      setDbStores(configuredNames);

      // Check if any of these active stores are missing a CNPJ
      const missingCnpjStores = activeStores.filter((s: any) => !s.cnpj || s.cnpj.trim() === "");
      if (missingCnpjStores.length > 0) {
        setNeedsOnboardingStores(missingCnpjStores.map((s: any) => ({ name: s.name })));
        setStatus("idle");
        isInitializing.current = false;
        return; // Halt data loading until CNPJs are provided
      }

      // 3. Live Cloud Fetch (Sem cache local)
      setLogs(prev => [...prev, "[System] Carregando histórico geral de vendas direto da nuvem..."]);

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

      const fetchAllParallel = async (tableName: string, columns: string, orderBy: string, targetStores: string[], numPartitions: number = 12, startOffsetPartition: number = 0) => {
        setLogs(prev => [...prev, `[System] Iniciando streaming temporal de ${tableName}...`]);
        const shouldFilterByStore = targetStores.length > 0 && tableName !== 'customers';
        const pageSize = 1000;
        let allData: any[] = [];
        
        const fetchPartition = async (startIso: string | null, endIso: string | null, partName: string) => {
             let chunkOffset = 0;
             let partitionData: any[] = [];
             while (true) {
                 let query = rawSupabase.from(tableName).select(columns).order(orderBy, { ascending: false }).range(chunkOffset, chunkOffset + pageSize - 1);
                 
                 // Apply date bounds if available (sales & orders)
                 if (startIso && endIso) {
                     query = query.gte(orderBy, startIso).lt(orderBy, endIso);
                 }
                 if (shouldFilterByStore) {
                     query = query.in('loja', targetStores);
                 }
                 
                 const { data, error } = await query;
                 if (error) {
                      console.error(`[Erro BATCH] Falha na partição ${partName} offset ${chunkOffset}:`, error);
                      setLogs(prev => [...prev, `[Erro DB] Falha na partição ${partName} de ${tableName} (${error.code || 'Timeout'}): ${error.message}`]);
                      break; 
                 }
                 
                 const records = data || [];
                 partitionData.push(...records);
                 if (records.length < pageSize) break; // Exhausted this partition
                 chunkOffset += pageSize;
             }
             return partitionData;
        };

        if (orderBy === 'data') {
            // TIME-PARTITIONING for giant tables (sales, orders)
            const partitions = [];
            for (let i = startOffsetPartition; i < startOffsetPartition + numPartitions; i++) {
                const end = new Date(); end.setDate(end.getDate() - (i * 30));
                const start = new Date(); start.setDate(start.getDate() - ((i + 1) * 30));
                partitions.push({ start: start.toISOString(), end: end.toISOString(), name: `Mês -${i+1}` });
            }

            const maxConcurrent = 3;
            for (let i = 0; i < partitions.length; i += maxConcurrent) {
               const batchPromises = [];
               for (let j = 0; j < maxConcurrent && (i + j) < partitions.length; j++) {
                   const p = partitions[i + j];
                   batchPromises.push(fetchPartition(p.start, p.end, p.name));
               }
               const batchResults = await Promise.all(batchPromises);
               allData.push(...batchResults.flat());
               setLogs(prev => [...prev, `[System] Progresso ${tableName}: Bloco ${Math.min(i + maxConcurrent, partitions.length)} de ${partitions.length} processado.`]);
            }
        } else {
            // Fallback for smaller/non-time tables (customers)
            // Just sequential offset sweep since it's super fast without RLS timeouts
            setLogs(prev => [...prev, `[System] Baixando ${tableName} de forma sequencial leve...`]);
            const results = await fetchPartition(null, null, "Global");
            allData.push(...results);
        }

        // Local memory deduplication to keep UI arrays identical to real DB
        const uniqueMap = new Map();
        allData.forEach((item: any) => {
          const key = item.id || `${item.sale_id || Math.random()}-${item.data}`;
          uniqueMap.set(key, item);
        });
        
        return Array.from(uniqueMap.values());
      };

      // --- CLOUD-NATIVE ARCHITECTURE MIGRATION ---
      // We no longer download 'sales' and 'orders' to the local browser memory!
      // The individual tabs (FinancialDashboard, CRM, etc) are responsible for fetching
      // their own aggregated JSON payloads directly from Next.js Serverless APIs.

      setLogs(prev => [...prev, "[System] Baixando metadados de clientes..."]);
      const newCustomers = await fetchAllParallel('customers', 'id, cpf, name, phone, email, gender, registration_date', 'id', configuredNames, 1, 0);

      const hydratedCustomers = newCustomers.map((c: any) => ({
        ...c,
        registrationDate: c.registration_date ? new Date(c.registration_date) : undefined
      }));

      // Restore massive memory state arrays so CRM, Gantt, and Churn work fully.
      try {
          // Changed from 24 (2 years) to 3 (90 days) to prevent 1+ minute boot times
          const newSales = await fetchAllParallel('sales', 'id, data, loja, valor, desconto, cliente, produto', 'data', configuredNames, 3, 0);
          const newOrders = await fetchAllParallel('orders', 'id, sale_id, machine, service, status, data, valor, loja', 'data', configuredNames, 3, 0);
          
          setAllRecords(newSales.map((r: any) => ({ ...r, data: new Date(r.data) })) as any[]);
          setAllOrders(newOrders.map((o: any) => ({ ...o, data: new Date(o.data) })) as any[]);
      } catch (err) {
          console.error("Failed fetching legacy lists:", err);
          setAllRecords([]);
          setAllOrders([]);
      }
      
      if (hydratedCustomers.length > 0) setAllCustomers(hydratedCustomers);
      
      setLogs(prev => [...prev, `[System] Cliente UI inicializado. Delegando cálculos para a Borda AWS.`]);
      setStatus("success");
      isInitializing.current = false;

    } catch (error: any) {
      console.error("[Home] Error reloading data:", error);
      setLogs(prev => [...prev, `[Erro Fatal] Falha na rede ao conectar com a nuvem: ${error.message}`]);
      setStatus("error");
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

  const stableFullRefresh = useCallback((token: string | null) => {
    reloadDataRef.current("Manual Atualizar", token, true);
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
                const orderUniqueKey = order.id || `${order.sale_id}_${order.machine}_${new Date(order.data).getTime()}`;
                const alreadyAdded = bestMatch.items.some((it: any) => (it.key || it.id) === orderUniqueKey);
                if (!alreadyAdded) {
                  bestMatch.items.push({
                    key: orderUniqueKey,
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


  async function handleSyncVMPay(passedToken: string | null = null) {
    const pushLog = (msg: string) => {
      const ts = new Date().toISOString().substring(11, 23); // HH:mm:ss.SSS
      setLogs(prev => [...prev, `[${ts}] ${msg}`]);
    };

    const startTime = performance.now();
    if (status === "uploading") {
      console.warn("[DashboardClient] Sync already in progress. Ignoring request.");
      return;
    }

    // Rate Limiting Logic (1 minute cooldown) to prevent VMPay API block
    const lastSyncTimeStr = localStorage.getItem('last_vmpay_sync');
    const now = Date.now();
    if (lastSyncTimeStr) {
        const lastSyncTime = parseInt(lastSyncTimeStr, 10);
        if (now - lastSyncTime < 60000) {
            const remainingSeconds = Math.ceil((60000 - (now - lastSyncTime)) / 1000);
            setStatus("error");
            setMessage(`Proteção contra bloqueio: Aguarde ${remainingSeconds} segundos antes de sincronizar novamente.`);
            setTimeout(() => setStatus("idle"), 5000);
            return;
        }
    }
    localStorage.setItem('last_vmpay_sync', now.toString());

    try {
      setStatus("uploading");
      setSyncProgress(0);
      setMessage("Preparando sincronização...");
      pushLog("[VMPay] Verificando sessão segura...");
      let token = passedToken;
      if (!token && initialSession?.access_token) {
        token = initialSession.access_token;
      }

      pushLog("[VMPay] Buscando lista de lojas cadastradas...");
      // 1. Get available store credentials first via secure API route (bypassing client-side DB lock)
      const resStores = await fetch('/api/force-sync/stores');
      const dataStores = await resStores.json();
      
      if (!resStores.ok || !dataStores.success) {
          throw new Error(dataStores.error || `HTTP error ${resStores.status}`);
      }
      const credentials = dataStores.stores || [];
      pushLog(`[VMPay] ${credentials.length} lojas identificadas. Iniciando ciclo...`);

      const allNewRawRecords: any[] = [];
      const totalStores = credentials.length;

      setSyncProgress(25);
      setMessage(`Sincronizando ${totalStores} loja(s) simultaneamente...`);
      pushLog(`[VMPay] Acionando Sincronização Global na Nuvem...`);

      const url = `/api/vmpay/sync?manual=true&_=${Date.now()}`;

      try {
        const controller = new AbortController();
        // 120s limite global para bater com limites máximos do Vercel caso necessário buscar histórico de 6 meses
        const timeoutId = setTimeout(() => controller.abort(), 120000); 

        const callStart = performance.now();
        pushLog(`[API] fetch(${url}) enviado.`);

        const res = await fetch(url, {
          method: "GET",
          headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        setSyncProgress(75);
        pushLog(`[API] Retorno recebido em ${((performance.now() - callStart) / 1000).toFixed(2)}s (HTTP ${res.status}). Lendo JSON...`);

        if (!res.ok) {
          const errResult = await res.json().catch(() => ({ error: `Status ${res.status}` }));
          throw new Error(errResult.error || 'Erro na sincronização global');
        }

        const result = await res.json();
        if (result.success && result.records) {
          allNewRawRecords.push(...result.records);
          pushLog(`[Sync] Nuvem finalizou agrupamento: ${result.records.length} novas vendas processadas.`);
        }
      } catch (globalErr: any) {
        pushLog(`[Erro] Sync Global falhou: ${globalErr.message}`);
        throw globalErr; // Encaminha o erro para abortar graciosamente
      }

      setSyncProgress(90); // Finished downloading, now re-rendering
      setMessage("Desenhando Novos Gráficos...");

      if (allNewRawRecords.length === 0) {
        pushLog("[VMPay] Nenhuma venda nova encontrada em nenhuma loja.");
        setStatus("success");
        setMessage("Sincronização concluída (Sem novos dados)");
        setSyncProgress(100);
        setTimeout(() => setSyncProgress(0), 3000);
        pushLog(`[Finalizado] Tempo total: ${((performance.now() - startTime) / 1000).toFixed(2)}s.`);
        return;
      }

      const rawRecords = allNewRawRecords;
      const totalToProcess = rawRecords.length;

      pushLog(`[VMPay] Ciclo completo: ${totalToProcess} novos registros integrados no banco de dados.`);
      pushLog(`[Sistema] Atualizando painel...`);

      try {
        await reloadAllData("Sincronismo", token);
      } catch (dbErr: any) {
        pushLog(`[Aviso] Falha ao recarregar a tela automaticamente: ${dbErr.message}`);
      }

      setSyncProgress(100);
      setStatus("success");
      setMessage("Sincronização concluída com sucesso!");
      setTimeout(() => setSyncProgress(0), 3000);
      pushLog(`[Finalizado] Tempo total de Sincronização + Recarga: ${((performance.now() - startTime) / 1000).toFixed(2)}s.`);
    } catch (e: any) {
      console.error(e);
      setSyncProgress(0);
      setStatus("error");
      setMessage(`Erro: ${e.message}`);
      const ts = new Date().toISOString().substring(11, 23);
      setLogs(prev => [...prev, `[${ts}] [Erro Fatal] ${e.message}`]);
    }
  }



  if (needsOnboardingStores.length > 0) {
    return (
      <OnboardingCnpj
        stores={needsOnboardingStores}
        onComplete={async () => {
          setNeedsOnboardingStores([]);
          const currentToken = initialSession?.access_token || null;
          await reloadAllData("Onboarding Complete", currentToken);
        }}
      />
    );
  }

  return (
    <SettingsProvider>
      <AuthProvider initialSession={initialSession} initialRole={initialRole} initialExpiresAt={initialExpiresAt} initialVmpayApiKey={initialVmpayApiKey}>
        <SubscriptionProvider>
          <CustomerProvider>
            <AppContent
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              status={status}
              setStatus={setStatus}
              message={message}
              setMessage={setMessage}
              logs={logs}
              allRecords={allRecords}
              allCustomers={allCustomers}
              data={viewData}
              stores={stores}
              allOrders={allOrders}
              selectedStore={selectedStore}
              setSelectedStore={setSelectedStore}
              handleFileUpload={handleFileUpload}
              handleSyncVMPay={handleSyncVMPay}

              stableInitialLoad={stableInitialLoad}
              stableFullRefresh={stableFullRefresh}
              syncProgress={syncProgress}
            />
          </CustomerProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
