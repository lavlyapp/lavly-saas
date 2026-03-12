import React, { createContext, useContext, useState, useEffect } from 'react';
export type PlanType = 'bronze' | 'prata' | 'ouro';
interface SubscriptionContextType {
    plan: PlanType;
    setPlan: (plan: PlanType) => void;
    canAccess: (feature: string) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    // Default to 'ouro' for development/demo, or load from profile in real app
    const [plan, setPlan] = useState<PlanType>('ouro');

    // Persist plan selection for demo purposes
    useEffect(() => {
        const savedPlan = localStorage.getItem('lavly_plan') as PlanType;
        if (savedPlan && ['bronze', 'prata', 'ouro'].includes(savedPlan)) {
            setPlan(savedPlan);
        }
    }, []);

    const updatePlan = (newPlan: PlanType) => {
        setPlan(newPlan);
        localStorage.setItem('lavly_plan', newPlan);
    };

    const canAccess = (feature: string): boolean => {
        const hasAccess = (targetPlan: PlanType) => {
            if (targetPlan === 'bronze') return true; // All plans have bronze features
            if (targetPlan === 'prata') {
                return plan === 'prata' || plan === 'ouro';
            }
            if (targetPlan === 'ouro') {
                return plan === 'ouro';
            }
            return false;
        };

        switch (feature) {
            case 'financial':
            case 'reports':
                return true; // Everyone accesses Financial and Reports

            case 'churn_kpi':
                return true; // Everyone sees Churn Totals

            case 'churn_list':
            case 'crm':
            case 'customer_details':
                return hasAccess('prata');

            case 'whatsapp':
                return hasAccess('ouro');

            default:
                return false;
        }
    };

    return (
        <SubscriptionContext.Provider value={{ plan, setPlan: updatePlan, canAccess }}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
}
