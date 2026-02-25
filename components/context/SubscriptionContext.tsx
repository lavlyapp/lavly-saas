import React, { createContext, useContext, useState, useEffect } from 'react';

export type PlanType = 'bronze' | 'silver' | 'gold';

interface SubscriptionContextType {
    plan: PlanType;
    setPlan: (plan: PlanType) => void;
    canAccess: (feature: string) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    // Default to 'gold' for development/demo, or load from profile in real app
    const [plan, setPlan] = useState<PlanType>('gold');

    // Persist plan selection for demo purposes
    useEffect(() => {
        const savedPlan = localStorage.getItem('vmpay_demo_plan') as PlanType;
        if (savedPlan && ['bronze', 'silver', 'gold'].includes(savedPlan)) {
            setPlan(savedPlan);
        }
    }, []);

    const updatePlan = (newPlan: PlanType) => {
        setPlan(newPlan);
        localStorage.setItem('vmpay_demo_plan', newPlan);
    };

    const canAccess = (feature: string): boolean => {
        switch (feature) {
            case 'financial':
            case 'reports':
                return true; // Everyone accesses Financial and Reports

            case 'churn_kpi':
                return true; // Everyone sees Churn Totals

            case 'churn_list':
            case 'crm':
            case 'customer_details':
                return plan === 'silver' || plan === 'gold';

            case 'whatsapp':
                return plan === 'gold';

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
