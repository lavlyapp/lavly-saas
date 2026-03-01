import { getVMPayCredentials, VMPayCredential } from "../vmpay-config";
import { syncVMPaySales } from "../vmpay-client";
import { supabase } from "../supabase";
import { updateTargetTimeDB, checkAndTurnOffAll } from "./scheduler";

/**
 * Checks if the current time is within the store's operating hours.
 */
function isWithinStoreHours(cred: VMPayCredential): boolean {
    if (!cred.openTime || !cred.closeTime) return true;

    const now = new Date();
    // VMPay stores are in Brazil (UTC-3), ensure we use the correct locale/tz
    const currentTimeStr = now.toLocaleTimeString('pt-BR', { hour12: false, timeZone: 'America/Sao_Paulo' });

    const [closeH, closeM, closeS] = cred.closeTime.split(':').map(Number);
    const closeDate = new Date(now);
    closeDate.setHours(closeH, closeM + 5, closeS);

    const graceTimeStr = closeDate.toLocaleTimeString('pt-BR', { hour12: false, timeZone: 'America/Sao_Paulo' });

    if (cred.openTime <= cred.closeTime) {
        return currentTimeStr >= cred.openTime && currentTimeStr <= graceTimeStr;
    } else {
        return currentTimeStr >= cred.openTime || currentTimeStr <= graceTimeStr;
    }
}

export async function processStoreSync(cred: VMPayCredential, isManual: boolean = false, supabaseClient?: any) {
    const db = supabaseClient || supabase;

    // Permite sincronização manual mesmo fora do horário de funcionamento
    if (!isManual && !isWithinStoreHours(cred)) {
        console.log(`[Sync Manager] Store ${cred.name} is CLOSED. Skipping sync.`);
        return;
    }

    const { data: storeData } = await db
        .from('stores')
        .select('last_sync_sales, ac_turn_off_at')
        .eq('cnpj', cred.cnpj)
        .single();

    const now = new Date();
    const fallbackDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 dias de histórico
    let lastSync = storeData?.last_sync_sales ? new Date(storeData.last_sync_sales) : fallbackDate;

    // Se for manual e não tiver histórico, forçamos a busca de 90 dias
    if (isManual && !storeData?.last_sync_sales) {
        lastSync = fallbackDate;
    }

    const acTurnOffAt = storeData?.ac_turn_off_at ? new Date(storeData.ac_turn_off_at) : null;

    let shouldSync = false;
    let syncIntervalReason = "";

    // Se for manual, sempre sincroniza. Se for automático, verifica as regras.
    if (isManual) {
        shouldSync = true;
        syncIntervalReason = "Acionamento Manual";
    } else {
        // Bloqueia sincronização automática conforme pedido do usuário
        console.log(`[Sync Manager] ⛔ Sincronização automática para ${cred.name} IGNORADA (Configuração do Usuário).`);
        return [];

        /* 
        // Lógica original de sync automático desativada:
        if (!cred.hasAcSubscription || !acTurnOffAt || now >= acTurnOffAt) {
            shouldSync = true;
            syncIntervalReason = "Standby (1min)";
        } else {
            const minutesRemaining = (acTurnOffAt.getTime() - now.getTime()) / 60000;
            const minutesSinceSync = (now.getTime() - lastSync.getTime()) / 60000;

            if (minutesSinceSync >= 30 || minutesRemaining <= 3) {
                shouldSync = true;
                syncIntervalReason = minutesRemaining <= 3 ? "Near Expiry (2-3min)" : "30min Refresh";
            }
        }
        */
    }

    if (shouldSync) {
        console.log(`[Sync Manager] 🔄 Syncing ${cred.name} - Reason: ${syncIntervalReason}`);

        const sales = await syncVMPaySales(lastSync, now, cred);

        // --- PERSISTENCE ---
        if (sales.length > 0) {
            const { upsertSales } = await import("../persistence");
            await upsertSales(sales, db);
        }

        // Update last sync time
        await db
            .from('stores')
            .update({ last_sync_sales: now.toISOString() })
            .eq('cnpj', cred.cnpj);

        // --- AUTOMATION TRIGGER ---
        if (cred.hasAcSubscription && sales.length > 0) {
            console.log(`[Sync Manager] Found ${sales.length} new sales for ${cred.name}. Triggering AC automation.`);

            // Calculate max end time from all machines in the new sales
            let maxEndTime = now;
            for (const sale of sales) {
                // Rule: Wash = 50min, Dry = 70min (defaults)
                const isDry = sale.produto.toUpperCase().includes("SEC") ||
                    sale.items?.some(i => i.service.toUpperCase().includes("SEC"));

                const duration = isDry ? 70 : 50;
                const saleEndTime = new Date(sale.data.getTime() + duration * 60000);

                if (saleEndTime > maxEndTime) maxEndTime = saleEndTime;
            }

            if (maxEndTime > now) {
                await updateTargetTimeDB(maxEndTime, cred.cnpj, cred);
            }
        }

        return sales;
    }
    return [];
}

/**
 * Global entry point for the Sync loop
 */
export async function runGlobalSync(isManual: boolean = false, supabaseClient?: any) {
    console.log(`[Sync Manager] Starting global loop at ${new Date().toISOString()} (Manual: ${isManual})`);
    const allNewSales: any[] = [];

    // 1. Handle AC Turn Off for expired timers (independente do sync de vendas)
    await checkAndTurnOffAll();

    // 2. Process all stores
    const credentials = await getVMPayCredentials();
    for (const cred of credentials) {
        const sales = await processStoreSync(cred, isManual, supabaseClient);
        if (sales && sales.length > 0) {
            allNewSales.push(...sales);
        }
    }

    return allNewSales;
}
