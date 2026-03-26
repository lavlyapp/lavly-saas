import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import DashboardClient from "@/components/layout/DashboardClient";

export const dynamic = "force-dynamic";

export default async function Page() {
    const cookieStore = await cookies();

    // Create an authenticated SSR client to fetch the user's initial session before any client Javascript runs
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

    console.log("[Server-Page] 🚀 Starting SSR Page render...");
    const { data: { session } } = await supabase.auth.getSession();
    console.log(`[Server-Page] Session detected: ${!!session?.user}`);

    let initialRole = null;
    let initialExpiresAt = null;
    let initialVmpayApiKey = null;
    if (session?.user) {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('role, expires_at, vmpay_api_key')
                .eq('id', session.user.id)
                .single();

            if (error) console.error("[Server-Page] Error fetching profile:", error.message);
            initialRole = profile?.role || 'proprietario';
            initialExpiresAt = profile?.expires_at || null;
            initialVmpayApiKey = profile?.vmpay_api_key || null;
        } catch (err) {
            console.error("[Server-Page] Critical catch fetching profile:", err);
        }
    }

    return <DashboardClient initialSession={session} initialRole={initialRole} initialExpiresAt={initialExpiresAt} initialVmpayApiKey={initialVmpayApiKey} />;
}
