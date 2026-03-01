import { supabase } from "./supabase";
import { SaleRecord, OrderRecord } from "./processing/etl";
import { getCanonicalStoreName } from "./vmpay-config";

/**
 * Persists sales and their related orders to the database using Upsert.
 */
export async function upsertSales(records: SaleRecord[], supabaseClient?: any) {
    if (!records || records.length === 0) return;

    const db = supabaseClient || supabase;

    try {
        console.log(`[Persistence] Upserting ${records.length} sales...`);

        // 1. Prepare Sales for DB (Snake Case)
        const salesToUpsert = records.map(r => ({
            id: r.id,
            data: r.data.toISOString(),
            loja: getCanonicalStoreName(r.loja),
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

        const { error: salesError } = await db
            .from('sales')
            .upsert(salesToUpsert, { onConflict: 'id' });

        if (salesError) throw salesError;

        // 2. Prepare Orders for DB
        // We flat map items from sales to ensure relationship
        const ordersToUpsert = records.flatMap(r =>
            (r.items || []).map(item => ({
                sale_id: r.id,
                data: item.startTime ? item.startTime.toISOString() : r.data.toISOString(),
                loja: getCanonicalStoreName(r.loja),
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
            const { error: ordersError } = await db
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
        console.log("[Persistence] Fetching sales history from Supabase with pagination...");

        // Helper to fetch all pages
        const fetchAll = async (tableName: string, orderColumn?: string) => {
            let allData: any[] = [];
            let r_count = 1000;
            let start = 0;
            let end = 999;

            while (r_count === 1000) {
                let query = supabase.from(tableName).select('*').range(start, end);
                if (orderColumn) {
                    query = query.order(orderColumn, { ascending: false });
                }

                const { data, error } = await query;
                if (error) throw error;

                if (data) {
                    allData = [...allData, ...data];
                    r_count = data.length;
                    start += 1000;
                    end += 1000;
                } else {
                    r_count = 0;
                }
            }
            return allData;
        };

        const sales = await fetchAll('sales', 'data');
        const orders = await fetchAll('orders');

        // Transform back to Record types
        // Optimization: Pre-group orders by sale_id to avoid O(N*M) search
        const ordersBySaleId = new Map<string, any[]>();
        orders.forEach(o => {
            if (!ordersBySaleId.has(o.sale_id)) {
                ordersBySaleId.set(o.sale_id, []);
            }
            ordersBySaleId.get(o.sale_id)!.push({
                machine: o.machine,
                service: o.service,
                status: o.status,
                startTime: new Date(o.data),
                value: Number(o.valor)
            });
        });

        const transformedSales: SaleRecord[] = sales.map(s => ({
            id: s.id,
            data: new Date(s.data),
            loja: getCanonicalStoreName(s.loja),
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
            items: ordersBySaleId.get(s.id) || []
        }));

        const transformedOrders: OrderRecord[] = orders.map(o => ({
            data: new Date(o.data),
            loja: getCanonicalStoreName(o.loja),
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
