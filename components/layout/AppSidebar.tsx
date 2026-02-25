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
}

export function AppSidebar({ activeTab, onTabChange, collapsed, onToggle }: AppSidebarProps) {
    const { plan, setPlan } = useSubscription();
    const { role, logout } = useAuth();

    const menuItems = [
        { id: 'financial', label: 'Financeiro', icon: LayoutDashboard, requiredPlan: 'bronze', roles: ['owner', 'attendant'] },
        { id: 'comparative', label: 'Fin. Comparativo (12M)', icon: BarChart2, requiredPlan: 'silver', roles: ['owner'] }, // New Comparative Dashboard
        { id: 'crm', label: 'CRM & Clientes', icon: Users, requiredPlan: 'silver', roles: ['owner'] }, // Silver+
        { id: 'demographics', label: 'Quem é o Cliente?', icon: Fingerprint, requiredPlan: 'bronze', roles: ['owner'] }, // Visible to all (Bronze+), blocked inside
        { id: 'marketing', label: 'Cupons & Marketing', icon: Tag, requiredPlan: 'silver', roles: ['owner'] }, // New
        { id: 'churn', label: 'Análise de Churn', icon: UserX, requiredPlan: 'silver', roles: ['owner', 'attendant'] }, // Silver+ (Moved from Bronze)
        { id: 'machines', label: 'Máquinas', icon: WashingMachine, requiredPlan: 'silver', roles: ['owner'] }, // Silver+
        { id: 'queue', label: 'Teoria das Filas', icon: Clock, requiredPlan: 'silver', roles: ['owner'] }, // Silver+
        { id: 'reports', label: 'Relatórios', icon: FileText, requiredPlan: 'bronze', roles: ['owner', 'superadmin'] },
        { id: 'logs', label: 'Logs do Sistema', icon: ShieldCheck, requiredPlan: 'bronze', roles: ['owner', 'superadmin'] },
        { id: 'settings', label: 'Configurações', icon: Settings, disabled: false, requiredPlan: 'silver', roles: ['owner', 'superadmin'] },
    ];

    // Simple permission check for menu visibility
    const isVisible = (required: string, itemRoles: string[]) => {
        if (!role || !itemRoles.includes(role)) return false;
        if (role === 'superadmin') return true; // Superadmin sees everything
        if (required === 'bronze') return true; // Everyone else sees bronze features
        if (required === 'silver') return plan === 'silver' || plan === 'gold';
        if (required === 'gold') return plan === 'gold';
        return false;
    };

    return (
        <div className={cn(
            "flex flex-col h-screen bg-neutral-950 border-r border-neutral-900 transition-all duration-300",
            collapsed ? "w-20" : "w-64"
        )}>
            <div className="p-6 flex items-center justify-between">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
                            V
                        </div>
                        <span className="font-bold text-white text-xl tracking-tight">VMPay</span>
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className="p-2 rounded-lg hover:bg-neutral-900 text-neutral-400 transition-colors"
                >
                    {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
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
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-neutral-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
                >
                    <LogOut className="w-5 h-5" />
                    {!collapsed && <span className="font-medium">Sair</span>}
                </button>
            </div>
        </div>
    );
}
