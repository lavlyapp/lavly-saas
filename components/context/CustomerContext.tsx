"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { CustomerProfile } from "@/lib/processing/crm";

interface CustomerContextType {
    selectedCustomerName: string | null;
    selectedCustomerProfile: CustomerProfile | null;
    openCustomerDetails: (customerName: string, profile?: CustomerProfile | null) => void;
    closeCustomerDetails: () => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
    const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
    const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<CustomerProfile | null>(null);

    const openCustomerDetails = (customerName: string, profile: CustomerProfile | null = null) => {
        setSelectedCustomerName(customerName);
        setSelectedCustomerProfile(profile);
    };

    const closeCustomerDetails = () => {
        setSelectedCustomerName(null);
        setSelectedCustomerProfile(null);
    };

    return (
        <CustomerContext.Provider value={{ selectedCustomerName, selectedCustomerProfile, openCustomerDetails, closeCustomerDetails }}>
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
