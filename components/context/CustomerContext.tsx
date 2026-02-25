"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { CustomerProfile } from "@/lib/processing/crm";

interface CustomerContextType {
    selectedCustomerName: string | null;
    openCustomerDetails: (customerName: string) => void;
    closeCustomerDetails: () => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
    const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);

    const openCustomerDetails = (customerName: string) => {
        setSelectedCustomerName(customerName);
    };

    const closeCustomerDetails = () => {
        setSelectedCustomerName(null);
    };

    return (
        <CustomerContext.Provider value={{ selectedCustomerName, openCustomerDetails, closeCustomerDetails }}>
            {children}
        </CustomerContext.Provider>
    );
}

export function useCustomerContext() {
    const context = useContext(CustomerContext);
    if (context === undefined) {
        throw new Error("useCustomerContext must be used within a CustomerProvider");
    }
    return context;
}
