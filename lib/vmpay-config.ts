import { supabase } from "./supabase";

export const VMPAY_API_BASE_URL = process.env.NEXT_PUBLIC_VMPAY_API_BASE_URL || "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";

export interface VMPayCredential {
    id?: string;
    name: string;
    cnpj: string;
    apiKey: string;
    openTime?: string; // HH:mm:ss
    closeTime?: string; // HH:mm:ss
    is_active?: boolean;
    hasAcSubscription?: boolean;
    tuyaDeviceId?: string;
    tuyaClientId?: string;
    tuyaClientSecret?: string;
    tuyaSceneOnId?: string;
    tuyaSceneOffId?: string;
}

export interface VMPayMasterAccount {
    user: string;
    pass: string;
}

// Static fallback for initial setup or development
export const STATIC_VMPAY_CREDENTIALS: VMPayCredential[] = [
    {
        name: "Lavateria Cascavel",
        cnpj: "43660010000166",
        apiKey: "e8689749-58b1-4a3e-8f1c-11d1a5e2b42e"
    },
    {
        name: "Lavateria SANTOS DUMONT",
        cnpj: "53261645000144",
        apiKey: "2bfcb6f6-144b-46c1-8fc3-cef8fbf41729"
    },
    {
        name: "Lavateria JOSE WALTER",
        cnpj: "53261614000193",
        apiKey: "a2862031-5a98-4eb2-8b0a-e7b8cc195263"
    },
    {
        name: "Lavateria SHOPPING (Maracanau)",
        cnpj: "51638594000100",
        apiKey: "f08c45c8-126a-4cb4-ab5d-5c8805c8130f"
    },
    {
        name: "Lavateria SHOPPING SOLARES",
        cnpj: "54539282000129",
        apiKey: "68360f6d-fbec-4991-bd2e-c6ff89201e40"
    },
    {
        name: "Lavateria JOQUEI",
        cnpj: "50741565000106",
        apiKey: "cc9c772c-ad36-43a6-a3af-582da70feb07"
    }
];

/**
 * Fetches VMPay master credentials for a specific user profile
 */
export async function getVMPayMasterAccount(userId: string): Promise<VMPayMasterAccount | null> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('vmpay_user, vmpay_password')
            .eq('id', userId)
            .single();

        if (error) throw error;
        if (data && data.vmpay_user) {
            return {
                user: data.vmpay_user,
                pass: data.vmpay_password || ''
            };
        }
    } catch (e) {
        console.error("[VMPay Config] Failed to fetch master account:", e);
    }
    return null;
}

/**
 * Fetches all active store credentials from the database.
 * Falls back to static credentials if the database is not configured or empty.
 */
export async function getVMPayCredentials(): Promise<VMPayCredential[]> {
    try {
        const { data, error } = await supabase
            .from('stores')
            .select(`
                id,
                name, 
                cnpj, 
                api_key, 
                open_time, 
                close_time, 
                is_active,
                has_ac_subscription,
                tuya_device_id,
                tuya_client_id,
                tuya_client_secret,
                tuya_scene_on_id,
                tuya_scene_off_id
            `)
            .eq('is_active', true);

        if (error) throw error;

        if (data && data.length > 0) {
            return data.map(d => ({
                id: d.id,
                name: d.name,
                cnpj: d.cnpj,
                apiKey: d.api_key,
                openTime: d.open_time,
                closeTime: d.close_time,
                is_active: d.is_active,
                hasAcSubscription: d.has_ac_subscription,
                tuyaDeviceId: d.tuya_device_id,
                tuyaClientId: d.tuya_client_id,
                tuyaClientSecret: d.tuya_client_secret,
                tuyaSceneOnId: d.tuya_scene_on_id,
                tuyaSceneOffId: d.tuya_scene_off_id
            }));
        }
    } catch (e) {
        console.warn("[VMPay Config] Falling back to static credentials due to error or empty DB:", e);
    }

    return STATIC_VMPAY_CREDENTIALS;
}
