import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Centralized server-side authorization for API routes.
 *
 * Background: many routes use the Supabase SERVICE_ROLE key (which bypasses RLS)
 * but historically did NOT verify the caller — they trusted the frontend to hide
 * the button. That is a broken-access-control hole (anyone with curl could read
 * every tenant's API keys / customer PII or ban accounts).
 *
 * This module authenticates the caller from EITHER:
 *   1. an `Authorization: Bearer <token>` header (dashboard fetches), or
 *   2. the Supabase session cookies (@supabase/ssr browser client stores the
 *      session in cookies, so same-origin fetches carry it automatically).
 *
 * The dummy placeholder token `ADMIN_REQUEST` used by the legacy admin dashboard
 * is intentionally ignored so the cookie path takes over.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface AuthContext {
    userId: string;
    email?: string;
    role: string | null;
    assignedStores: string[];
    /** Service-role client (bypasses RLS). Use only AFTER authorization passes. */
    admin: SupabaseClient;
}

export async function getAuthContext(request: Request): Promise<AuthContext | null> {
    let userId: string | undefined;
    let email: string | undefined;

    // 1. Bearer token (ignore the legacy dummy placeholder)
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (token && token !== 'ADMIN_REQUEST') {
        const c = createClient(SUPABASE_URL, ANON_KEY);
        const { data, error } = await c.auth.getUser(token);
        if (!error && data?.user) {
            userId = data.user.id;
            email = data.user.email ?? undefined;
        }
    }

    // 2. Cookie session fallback
    if (!userId) {
        const cookieStore = await cookies();
        const c = createServerClient(SUPABASE_URL, ANON_KEY, {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll() { /* route handlers are read-only for cookies here */ },
            },
        });
        const { data } = await c.auth.getUser();
        if (data?.user) {
            userId = data.user.id;
            email = data.user.email ?? undefined;
        }
    }

    if (!userId) return null;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile } = await admin
        .from('profiles')
        .select('role, assigned_stores')
        .eq('id', userId)
        .single();

    return {
        userId,
        email,
        role: profile?.role ?? null,
        assignedStores: (profile?.assigned_stores as string[]) ?? [],
        admin,
    };
}

/** Returns AuthContext, or a 401 NextResponse if the caller is not authenticated. */
export async function requireAuth(request: Request): Promise<AuthContext | NextResponse> {
    const ctx = await getAuthContext(request);
    if (!ctx) {
        return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    }
    return ctx;
}

/** Returns AuthContext, or 401/403 if the caller is not an authenticated admin. */
export async function requireAdmin(request: Request): Promise<AuthContext | NextResponse> {
    const ctx = await getAuthContext(request);
    if (!ctx) {
        return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    }
    if (ctx.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Acesso negado. Requer administrador.' }, { status: 403 });
    }
    return ctx;
}

/** Type guard: true when requireAuth/requireAdmin returned an error response. */
export function isAuthError(result: AuthContext | NextResponse): result is NextResponse {
    return result instanceof NextResponse;
}
