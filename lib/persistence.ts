import { supabase } from "./supabase";
import { SaleRecord, OrderRecord } from "./processing/etl";

/**
 * Persists sales and their related orders to the database using Upsert.
 */
export async function upsertSales(records: SaleRecord[]) {
    if (!records || records.length === 0) return;

    try {
        console.log(`[Persistence] Upserting ${records.length} sales...`);

        // 1. Prepare Sales for DB (Snake Case)
        const salesToUpsert = records.map(r => ({
            id: r.id,
            data: r.data.toISOString(),
            loja: r.loja,
            cliente: r.cliente,
            customer_id: r.customerId,
            produto: r.produto,
            valor: r.valor,
            forma_pagamento: r.formaPagamento,
            tipo_cartao: r.tipoCartao,
            categoria_voucher: r.categoriaVoucher,
            desconto: r.desconto,
            telefone: r.telefone,
            birth_date: r.birthDate ? r.birthDate.toISOString().split('T')[0] : null,
            age: r.age,
            updated_at: new Date().toISOString()
        }));

        const { error: salesError } = await supabase
            .from('sales')
            .upsert(salesToUpsert, { onConflict: 'id' });

        if (salesError) throw salesError;

        // 2. Prepare Orders for DB
        // We flat map items from sales to ensure relationship
        const ordersToUpsert = records.flatMap(r =>
            (r.items || []).map(item => ({
                sale_id: r.id,
                data: item.startTime ? item.startTime.toISOString() : r.data.toISOString(),
                loja: r.loja,
                cliente: r.cliente,
                machine: item.machine,
                service: item.service,
                status: item.status,
                valor: item.value || 0,
                customer_id: r.customerId
            }))
        );

        if (ordersToUpsert.length > 0) {
            console.log(`[Persistence] Upserting ${ordersToUpsert.length} related orders...`);
            // Note: Orders table uses auto-generated UUID, but we want to avoid duplicates if possible.
            // For now, we'll just insert, but in a production app we might want a unique key for orders too.
            const { error: ordersError } = await supabase
                .from('orders')
                .upsert(ordersToUpsert, { onConflict: 'sale_id, machine, data' }); // Hypothetical unique key

            if (ordersError) {
                console.warn("[Persistence] Order upsert error (continuing):", ordersError.message);
            }
        }

        return { success: true };
    } catch (e: any) {
        console.error("[Persistence] Failed to upsert sales:", e);
        return { success: false, error: e.message };
    }
}

/**
 * Fetches all sales history from the database.
 */
export async function fetchSalesHistory() {
    try {
        console.log("[Persistence] Fetching sales history from Supabase...");

        const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select('*')
            .order('data', { ascending: false });

        if (salesError) throw salesError;

        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*');

        if (ordersError) throw ordersError;

        // Transform back to Record types
        const transformedSales: SaleRecord[] = sales.map(s => ({
            id: s.id,
            data: new Date(s.data),
            loja: s.loja,
            cliente: s.cliente,
            customerId: s.customer_id,
            produto: s.produto,
            valor: Number(s.valor),
            formaPagamento: s.forma_pagamento,
            tipoCartao: s.tipo_cartao,
            categoriaVoucher: s.categoria_voucher,
            desconto: Number(s.desconto),
            telefone: s.telefone,
            birthDate: s.birth_date ? new Date(s.birth_date) : undefined,
            age: s.age,
            originalRow: 0,
            items: orders
                .filter(o => o.sale_id === s.id)
                .map(o => ({
                    machine: o.machine,
                    service: o.service,
                    status: o.status,
                    startTime: new Date(o.data),
                    value: Number(o.valor)
                }))
        }));

        const transformedOrders: OrderRecord[] = orders.map(o => ({
            data: new Date(o.data),
            loja: o.loja,
            cliente: o.cliente,
            machine: o.machine,
            service: o.service,
            status: o.status,
            valor: Number(o.valor),
            customerId: o.customer_id,
            originalRow: 0
        }));

        return { sales: transformedSales, orders: transformedOrders };
    } catch (e: any) {
        console.error("[Persistence] Failed to fetch sales:", e);
        return { sales: [], orders: [] };
    }
}
