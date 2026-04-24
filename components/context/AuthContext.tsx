"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { clear } from 'idb-keyval';

export type Role = "admin" | "proprietario" | "atendente";

interface AuthContextType {
    user: User | null;
    role: Role | null;
    expiresAt: string | null;
    isLifetimeAccess: boolean;
    isExpired: boolean;
    token: string | null;
    vmpayApiKey: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ error: any }>;
    loginWithMagicLink: (email: string) => Promise<{ error: any }>;
    loginWithGoogle: () => Promise<{ error: any }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialSession, initialRole, initialExpiresAt, initialVmpayApiKey }: { children: ReactNode, initialSession?: any, initialRole?: Role | null, initialExpiresAt?: string | null, initialVmpayApiKey?: string | null }) {
    const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
    const [role, setRole] = useState<Role | null>(initialRole ?? null);
    const [expiresAt, setExpiresAt] = useState<string | null>(initialExpiresAt ?? null);
    const [isLifetimeAccess, setIsLifetimeAccess] = useState<boolean>(false);
    const [vmpayApiKey, setVmpayApiKey] = useState<string | null>(initialVmpayApiKey ?? null);
    const [token, setToken] = useState<string | null>(initialSession?.access_token ?? null);
    const [isLoading, setIsLoading] = useState(!initialSession || (initialSession.user && !initialRole));

    useEffect(() => {
        const fetchProfile = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role, expires_at, vmpay_api_key, is_lifetime_access')
                    .eq('id', userId)
                    .single();

                if (data) {
                    setRole(data.role as Role);
                    setExpiresAt(data.expires_at);
                    setIsLifetimeAccess(data.is_lifetime_access || false);
                    setVmpayApiKey(data.vmpay_api_key);
                } else if (error) {
                    setRole("proprietario");
                    setExpiresAt(null);
                    setIsLifetimeAccess(false);
                }
            } finally {
                setIsLoading(false);
            }
        };

        if (!initialSession) {
            console.log("[Auth] No initial session, fetching...");
            supabase.auth.getSession().then(({ data: { session } }) => {
                setUser(session?.user ?? null);
                setToken(session?.access_token ?? null);
                if (session?.user) {
                    fetchProfile(session.user.id);
                } else {
                    setIsLoading(false);
                }
            });
        } else if (initialSession?.user && !initialRole) {
            console.log("[Auth] have session but no role, fetching profile...");
            fetchProfile(initialSession.user.id);
        } else {
            // Already have session and role (from server or previous state)
            setIsLoading(false);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setToken(session?.access_token ?? null);
            if (currentUser) {
                await fetchProfile(currentUser.id);
            } else {
                setRole(null);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [initialSession, initialRole]);

    // --- Failsafe Cleanup ---
    useEffect(() => {
        if (!isLoading) return;
        const timer = setTimeout(() => {
            if (isLoading) {
                console.warn("[Auth] ⚠️ Failsafe timeout reached. Forcing loading to false.");
                setIsLoading(false);
            }
        }, 10000); // 10 seconds max
        return () => clearTimeout(timer);
    }, [isLoading]);

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const loginWithMagicLink = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/dashboard`,
            },
        });
        return { error };
    };

    const loginWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`
            }
        });
        return { error };
    };

    const logout = async () => {
        try {
            await Promise.race([clear(), new Promise(resolve => setTimeout(resolve, 1000))]);
            console.log("[Auth] Local cache cleared.");
        } catch (e) {
            console.error("[Auth] Failed to clear local cache:", e);
        }

        try {
            // Previne que o logout trave caso a rede caia ou demore
            await Promise.race([
                supabase.auth.signOut(),
                new Promise(resolve => setTimeout(resolve, 2000))
            ]);
        } catch (e) {
            console.error("[Auth] SignOut error:", e);
        }

        // Force cleanup of session state
        setUser(null);
        setRole(null);
        setToken(null);
        setExpiresAt(null);
        setVmpayApiKey(null);

        // Aggressively clear browser storage and cookies
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.clear();
                window.sessionStorage.clear();

                const cookies = document.cookie.split("; ");
                for (let i = 0; i < cookies.length; i++) {
                    const cookieName = cookies[i].split("=")[0];
                    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                    // Also try to clear domain-level cookies
                    const domain = window.location.hostname;
                    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
                    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${domain}`;
                }
            } catch (e) {
                console.error("[Auth] Error clearing browser storage:", e);
            }
        }
    };

    const isExpired = isLifetimeAccess ? false : (expiresAt ? new Date() > new Date(expiresAt) : false);

    return (
        <AuthContext.Provider value={{
            user,
            role,
            expiresAt,
            isLifetimeAccess,
            isExpired,
            token,
            vmpayApiKey,
            isAuthenticated: !!user,
            isLoading,
            login,
            loginWithMagicLink,
            loginWithGoogle,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
