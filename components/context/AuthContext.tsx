"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export type Role = "admin" | "proprietario" | "atendente";

interface AuthContextType {
    user: User | null;
    role: Role | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ error: any }>;
    loginWithMagicLink: (email: string) => Promise<{ error: any }>;
    loginWithGoogle: () => Promise<{ error: any }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialSession, initialRole }: { children: ReactNode, initialSession?: any, initialRole?: Role | null }) {
    const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
    const [role, setRole] = useState<Role | null>(initialRole ?? null);
    const [token, setToken] = useState<string | null>(initialSession?.access_token ?? null);
    const [isLoading, setIsLoading] = useState(!initialSession || (initialSession.user && !initialRole));

    useEffect(() => {
        const fetchProfile = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', userId)
                    .single();

                if (data) {
                    setRole(data.role as Role);
                } else if (error) {
                    setRole("proprietario");
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
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{
            user,
            role,
            token,
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
