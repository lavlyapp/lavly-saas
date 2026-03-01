import { supabase } from "./supabase";

export type ActivityAction =
    | "LOGIN"
    | "LOGOUT"
    | "SYNC_VMPAY"
    | "UPLOAD_FILE"
    | "AC_TRIGGER"
    | "STORE_UPDATE"
    | "SYNC_VMPAY_CRON"
    | "COUPON_UPLOAD";

/**
 * Logs a system activity to Supabase for audit purposes.
 */
export async function logActivity(
    action: ActivityAction,
    userId: string | null,
    details: any = {},
    storeCnpj?: string
) {
    try {
        const { error } = await supabase
            .from('activity_logs')
            .insert([{
                user_id: userId,
                action,
                details,
                store_cnpj: storeCnpj,
                created_at: new Date().toISOString()
            }]);

        if (error) {
            console.error("[Logger] Failed to log activity:", error);
        }
    } catch (e) {
        console.error("[Logger] Unexpected error logging activity:", e);
    }
}
