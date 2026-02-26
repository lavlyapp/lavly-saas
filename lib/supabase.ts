import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase credentials missing. Database features will be unavailable.');
}

const isBrowser = typeof window !== 'undefined';

// Custom storage to bypass Navigator Lock API issues in some production environments
const customStorage = {
    getItem: (key: string) => {
        if (!isBrowser) return null;
        return window.localStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
        if (!isBrowser) return;
        window.localStorage.setItem(key, value);
    },
    removeItem: (key: string) => {
        if (!isBrowser) return;
        window.localStorage.removeItem(key);
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'lavly-auth-token',
        storage: customStorage,
        // Explicitly bypass navigator.locks which causes hangs in production
        lock: async (name: any, acquire: any) => {
            if (typeof acquire === 'function') return await acquire();
            if (typeof name === 'function') return await name();
        }
    }
});
