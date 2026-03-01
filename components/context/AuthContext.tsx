"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export type Role = "superadmin" | "owner" | "attendant";

interface AuthContextType {
    user: User | null;
    role: Role | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ error: any }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialSession }: { children: ReactNode, initialSession?: any }) {
    const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
    const [role, setRole] = useState<Role | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
                    console.error("[Auth] Error fetching profile:", error);
                    setRole("owner");
                }
            } finally {
                setIsLoading(false);
            }
        };

        if (!initialSession) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchProfile(session.user.id);
                } else {
                    setIsLoading(false);
                }
            });
        } else if (initialSession?.user && !role) {
            fetchProfile(initialSession.user.id);
        } else {
            setIsLoading(false);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                await fetchProfile(currentUser.id);
            } else {
                setRole(null);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [initialSession, role]);

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{
            user,
            role,
            isAuthenticated: !!user,
            isLoading,
            login,
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
