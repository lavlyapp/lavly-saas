"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export type Role = "admin" | "proprietario" | "atendente";

interface AuthContextType {
    user: User | null;
    role: Role | null;
    expiresAt: string | null;
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
    const [vmpayApiKey, setVmpayApiKey] = useState<string | null>(initialVmpayApiKey ?? null);
    const [token, setToken] = useState<string | null>(initialSession?.access_token ?? null);
    const [isLoading, setIsLoading] = useState(!initialSession || (initialSession.user && !initialRole));

    useEffect(() => {
        const fetchProfile = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role, expires_at, vmpay_api_key')
                    .eq('id', userId)
                    .single();

                if (data) {
                    setRole(data.role as Role);
                    setExpiresAt(data.expires_at);
                    setVmpayApiKey(data.vmpay_api_key);
                } else if (error) {
                    setRole("proprietario");
                    setExpiresAt(null);
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
            const { clear } = await import('idb-keyval');
            await Promise.race([clear(), new Promise(resolve => setTimeout(resolve, 1500))]);
            console.log("[Auth] Local cache cleared.");
        } catch (e) {
            console.error("[Auth] Failed to clear local cache:", e);
        }
        await supabase.auth.signOut();
    };

    const isExpired = expiresAt ? new Date() > new Date(expiresAt) : false;

    return (
        <AuthContext.Provider value={{
            user,
            role,
            expiresAt,
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
