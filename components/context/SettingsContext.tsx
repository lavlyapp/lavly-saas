"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface StoreSettings {
    address: string;
}

export interface StoreAutomationSettings {
    status: 'ATIVADO' | 'DESATIVADO';
    minLavagem: number;
    minSecagem: number;
    tuyaAccessId: string;
    tuyaAccessSecret: string;
    tuyaDeviceId: string;
    tuyaHubId?: string;
    tuyaSceneOnId?: string;
    tuyaSceneOffId?: string;
}

export type AutomationSettingsMap = Record<string, StoreAutomationSettings>;

interface SettingsContextType {
    storeSettings: Record<string, StoreSettings>;
    setStoreAddress: (storeName: string, address: string) => void;
    getStoreAddress: (storeName: string) => string;

    automationSettings: AutomationSettingsMap;
    setAutomationSettings: (settings: AutomationSettingsMap) => void;
    setStoreTuyaSettings: (store: string, settings: StoreAutomationSettings) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    // Dictionary mapping storeName to its settings
    const [storeSettings, setStoreSettings] = useState<Record<string, StoreSettings>>({});

    const [automationSettings, setAutomationSettings] = useState<AutomationSettingsMap>({});

    // Load from LocalStorage if available
    useEffect(() => {
        const savedSettings = localStorage.getItem('vmpay_store_settings');
        if (savedSettings) {
            try {
                setStoreSettings(JSON.parse(savedSettings));
            } catch (e) {
                console.error("Failed to parse saved store settings", e);
            }
        }

        const savedAutomation = localStorage.getItem('vmpay_automation_settings');
        if (savedAutomation) {
            try {
                setAutomationSettings(JSON.parse(savedAutomation));
            } catch (e) {
                console.error("Failed to parse saved automation settings", e);
            }
        }
    }, []);

    // Keep LocalStorage in sync for storeSettings
    useEffect(() => {
        localStorage.setItem('vmpay_store_settings', JSON.stringify(storeSettings));
    }, [storeSettings]);

    // Keep LocalStorage in sync for automationSettings
    useEffect(() => {
        localStorage.setItem('vmpay_automation_settings', JSON.stringify(automationSettings));
    }, [automationSettings]);

    const handleSetStoreAddress = (storeName: string, address: string) => {
        setStoreSettings(prev => ({
            ...prev,
            [storeName.toUpperCase()]: { ...prev[storeName.toUpperCase()], address }
        }));
    };

    const getStoreAddress = (storeName: string): string => {
        return storeSettings[storeName.toUpperCase()]?.address || '';
    };

    const setStoreTuyaSettings = (store: string, settings: StoreAutomationSettings) => {
        setAutomationSettings(prev => ({ ...prev, [store.toUpperCase()]: settings }));
    };

    return (
        <SettingsContext.Provider value={{
            storeSettings,
            setStoreAddress: handleSetStoreAddress,
            getStoreAddress,
            automationSettings,
            setAutomationSettings,
            setStoreTuyaSettings
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
