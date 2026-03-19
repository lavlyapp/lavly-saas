import {
    LayoutDashboard, Users, WashingMachine, Settings,
    UserX, FileText, ChevronLeft, ChevronRight, LogOut,
    Clock, ShieldCheck, Fingerprint, Tag, BarChart2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription, PlanType } from "@/components/context/SubscriptionContext";
import { useAuth, Role } from "@/components/context/AuthContext";


interface AppSidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    collapsed: boolean;
    onToggle: () => void;
    isMobileOpen?: boolean;
    onMobileClose?: () => void;
}

export function AppSidebar({ activeTab, onTabChange, collapsed, onToggle, isMobileOpen, onMobileClose }: AppSidebarProps) {
    const { plan, setPlan } = useSubscription();
    const { role, logout, user } = useAuth();

    const menuItems = [
        { id: 'financial', label: 'Financeiro', icon: LayoutDashboard, requiredPlan: 'bronze', roles: ['proprietario', 'atendente'] },
        { id: 'comparative', label: 'Fin. Comparativo (12M)', icon: BarChart2, requiredPlan: 'prata', roles: ['proprietario'] }, // New Comparative Dashboard
        { id: 'crm', label: 'CRM & Clientes', icon: Users, requiredPlan: 'prata', roles: ['proprietario'] }, // Silver+
        { id: 'demographics', label: 'Quem é o Cliente?', icon: Fingerprint, requiredPlan: 'bronze', roles: ['proprietario'] }, // Visible to all (Bronze+), blocked inside
        { id: 'marketing', label: 'Cupons & Marketing', icon: Tag, requiredPlan: 'prata', roles: ['proprietario'] }, // New
        { id: 'churn', label: 'Análise de Churn', icon: UserX, requiredPlan: 'prata', roles: ['proprietario', 'atendente'] }, // Silver+ (Moved from Bronze)
        { id: 'machines', label: 'Máquinas', icon: WashingMachine, requiredPlan: 'prata', roles: ['proprietario'] }, // Silver+
        { id: 'queue', label: 'Teoria das Filas', icon: Clock, requiredPlan: 'prata', roles: ['proprietario'] }, // Silver+
        { id: 'reports', label: 'Relatórios', icon: FileText, requiredPlan: 'bronze', roles: ['proprietario', 'admin'] },
        { id: 'logs', label: 'Logs do Sistema', icon: ShieldCheck, requiredPlan: 'bronze', roles: ['proprietario', 'admin'] },
        { id: 'admin', label: 'Lavly SaaS Admin', icon: LayoutDashboard, requiredPlan: 'bronze', roles: ['admin'] },
        { id: 'settings', label: 'Configurações', icon: Settings, disabled: false, requiredPlan: 'prata', roles: ['proprietario', 'admin'] },
    ];

    // Simple permission check for menu visibility
    const isVisible = (required: string, itemRoles: string[]) => {
        if (!role || (!itemRoles.includes(role) && role !== 'admin')) return false;
        if (role === 'admin') return true; // Admin sees everything
        if (required === 'bronze') return true; // Everyone else sees bronze features
        if (required === 'prata') return plan === 'prata' || plan === 'ouro';
        if (required === 'ouro') return plan === 'ouro';
        return false;
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 md:hidden" 
                    onClick={onMobileClose}
                />
            )}
            <div className={cn(
                "flex flex-col h-screen bg-neutral-950 border-r border-neutral-900 transition-all duration-300 z-50",
                "fixed inset-y-0 left-0 md:relative",
                isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
                collapsed ? "md:w-20" : "md:w-64"
            )}>
                <div className="p-6 flex items-start justify-between">
                    {(!collapsed || isMobileOpen) && (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
                                    L
                                </div>
                                <span className="font-bold text-white text-xl tracking-tight">Lavly</span>
                            </div>
                            {user && user.email && (
                                <span className="text-[10px] text-neutral-500 font-medium truncate max-w-[160px] pl-1" title={user.email}>
                                    {user.email}
                                </span>
                            )}
                        </div>
                    )}
                    <button
                        onClick={isMobileOpen ? onMobileClose : onToggle}
                        className="p-2 rounded-lg hover:bg-neutral-900 text-neutral-400 transition-colors hidden md:block"
                    >
                        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    </button>
                    {/* Botão fechar apenas no mobile */}
                    <button
                        onClick={onMobileClose}
                        className="p-2 rounded-lg hover:bg-neutral-900 text-neutral-400 transition-colors md:hidden"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                </div>

            <nav className="flex-1 px-4 space-y-2 mt-4">
                {menuItems.filter(item => isVisible(item.requiredPlan, item.roles)).map((item) => (
                    <button
                        key={item.id}
                        disabled={!!item.disabled}
                        onClick={() => onTabChange(item.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                            activeTab === item.id
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                : "text-neutral-400 hover:bg-neutral-900 hover:text-white",
                            item.disabled && "opacity-30 cursor-not-allowed"
                        )}
                    >
                        <item.icon className={cn(
                            "w-5 h-5 transition-transform",
                            activeTab === item.id ? "scale-110" : "group-hover:scale-110"
                        )} />
                        {!collapsed && <span className="font-medium">{item.label}</span>}
                    </button>
                ))}
            </nav>

            {/* Plan/Role Display */}
            {!collapsed && role && (
                <div className="px-4 py-4 border-t border-neutral-900 flex flex-col gap-1 text-center">
                    <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                        Plano {plan?.toUpperCase()}
                    </div>
                </div>
            )}


            <div className="p-4 mt-auto">
                <button
                    onClick={async () => {
                        await logout();
                        window.location.href = '/';
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-neutral-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
                >
                    <LogOut className="w-5 h-5" />
                    {!collapsed && <span className="font-medium">Sair</span>}
                </button>
            </div>
        </div>
        </>
    );
}
