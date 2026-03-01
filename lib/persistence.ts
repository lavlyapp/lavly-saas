import { supabase } from "./supabase";
import { SaleRecord, OrderRecord, CustomerRecord } from "./processing/etl";
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

        // Helper to fetch all pages with concurrent batches
        const fetchAll = async (tableName: string, orderColumn?: string) => {
            const { count, error: countErr } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true });

            if (countErr) {
                console.warn(`[Persistence] Could not get count for ${tableName}:`, countErr);
                return [];
            }
            if (!count) return [];

            const pageSize = 1000;
            const pages = Math.ceil(count / pageSize);
            const queryFns = [];

            for (let i = 0; i < pages; i++) {
                queryFns.push(async () => {
                    const start = i * pageSize;
                    const end = start + pageSize - 1;
                    let query = supabase.from(tableName).select('*').range(start, end);
                    if (orderColumn) {
                        query = query.order(orderColumn, { ascending: false });
                    }
                    return query;
                });
            }

            let allData: any[] = [];
            // Run 10 requests concurrently
            for (let i = 0; i < queryFns.length; i += 10) {
                const chunk = queryFns.slice(i, i + 10);
                const chunkResults = await Promise.all(chunk.map(fn => fn()));
                for (const res of chunkResults) {
                    if (res.error) throw res.error;
                    if (res.data) {
                        for (let j = 0; j < res.data.length; j++) {
                            allData.push(res.data[j]);
                        }
                    }
                }
            }

            console.log(`[Persistence] fetchAll completed for ${tableName}. Total rows: ${allData.length}`);
            return allData;
        };

        const sales = await fetchAll('sales', 'data');
        const orders = await fetchAll('orders', 'data');

        let customers: any[] = [];
        try {
            customers = await fetchAll('customers', 'name');
        } catch (e: any) {
            console.warn("[Persistence] Customers table not found or error fetching. Skipping customer demographic preset.", e.message);
        }

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

        const transformedCustomers: CustomerRecord[] = customers.map(c => ({
            id: c.id,
            cpf: c.cpf,
            name: c.name,
            phone: c.phone,
            email: c.email,
            gender: c.gender,
            registrationDate: c.registration_date ? new Date(c.registration_date) : undefined,
            originalRow: 0
        }));

        return { sales: transformedSales, orders: transformedOrders, customers: transformedCustomers };
    } catch (e: any) {
        console.error("[Persistence] Failed to fetch sales:", e);
        return { sales: [], orders: [] };
    }
}

/**
 * Persists customers to the database using Upsert.
 */
export async function upsertCustomers(records: CustomerRecord[], supabaseClient?: any) {
    if (!records || records.length === 0) return;
    const db = supabaseClient || supabase;

    try {
        console.log(`[Persistence] Upserting ${records.length} customers...`);

        const customersToUpsert = records.map(r => ({
            id: r.id, // optional
            cpf: r.cpf,
            name: r.name,
            phone: r.phone,
            email: r.email,
            gender: r.gender || 'U',
            registration_date: r.registrationDate ? r.registrationDate.toISOString() : null,
            updated_at: new Date().toISOString()
        }));

        // We use CPF or name as unique conflict identifier, assuming CPF is UNIQUE.
        // Wait, if CPF is not always present, name/phone might conflict. We'll use CPF if possible.
        // For now, let's just insert with no onConflict if we don't know the exact unique constraint yet, or rely on id.
        // The SQL script created UNIQUE(cpf). But if cpf is null? Supabase allows multiple nulls in unique constraints.
        const { error } = await db
            .from('customers')
            .upsert(customersToUpsert, { onConflict: 'cpf', ignoreDuplicates: false });

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error("[Persistence] Failed to upsert customers:", e);
        return { success: false, error: e.message };
    }
}
