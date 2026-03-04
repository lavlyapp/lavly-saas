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

        console.log(`[Persistence] Upserting ${salesToUpsert.length} sales records...`);
        const { error: salesError } = await db
            .from('sales')
            .upsert(salesToUpsert, { onConflict: 'id' });

        if (salesError) {
            console.error(`[Persistence] ❌ Error in upsertSales (sales table): ${salesError.message}`);
            console.error("[Persistence] Sales records sample (first 1):", JSON.stringify(salesToUpsert.slice(0, 1), null, 2));
            throw salesError;
        }
        console.log(`[Persistence] ✅ Successfully upserted ${salesToUpsert.length} sales records.`);

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
export async function fetchSalesHistory(supabaseClient?: any) {
    const db = supabaseClient || supabase;
    try {
        console.log("[Persistence] Fetching sales history from Supabase with pagination...");

        // Helper to fetch all pages with concurrent batches
        const withTimeout = async (promise: Promise<any>, timeoutMs: number) => {
            let timeoutId: any;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error("Timeout")), timeoutMs);
            });
            return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
        };

        const fetchAll = async (tableName: string, orderColumn?: string) => {
            try {
                const { count, error: countErr } = await withTimeout(
                    db
                        .from(tableName)
                        .select('*', { count: 'exact', head: true }) as any,
                    15000 // Aumentado para 15s
                );

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
                        let query: any = db.from(tableName).select('*').range(start, end);
                        if (orderColumn) {
                            query = query.order(orderColumn, { ascending: false });
                        }
                        return withTimeout(query as any, 15000); // Aumentado para 15s
                    });
                }

                let allData: any[] = [];
                // Run 5 requests concurrently para não afogar o banco
                for (let i = 0; i < queryFns.length; i += 5) {
                    const chunk = queryFns.slice(i, i + 5);
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
            } catch (err: any) {
                console.warn(`[Persistence] fetchAll failed for ${tableName} (timeout or error): ${err.message}`);
                return [];
            }
        };

        console.log("[Persistence] Fetching sales, orders, and customers in parallel (40s limit)...");
        const [sales, orders, customers] = await withTimeout(
            Promise.all([
                fetchAll('sales', 'data'),
                fetchAll('orders', 'data'),
                fetchAll('customers', 'name').catch(e => {
                    console.warn("[Persistence] Customers table error. Skipping.", e.message);
                    return [];
                })
            ]),
            40000 // 40 Segundos
        ).catch(err => {
            console.error("[Persistence] Parallel fetch timed out! Returning empty datasets.", err.message);
            return [[], [], []];
        });

        // Transform back to Record types
        // Optimization: Pre-group orders by sale_id to avoid O(N*M) search
        const ordersBySaleId = new Map<string, any[]>();
        (orders as any[]).forEach((o: any) => {
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

        const transformedSales: SaleRecord[] = (sales as any[]).map((s: any) => ({
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

        const transformedOrders: OrderRecord[] = (orders as any[]).map((o: any) => ({
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

        const transformedCustomers: CustomerRecord[] = (customers as any[]).map((c: any) => ({
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
    if (!records || records.length === 0) return { success: true };
    const db = supabaseClient || supabase;

    try {
        console.log(`[Persistence] Safely merging ${records.length} customers...`);

        // 1. Fetch existing customers to match by name
        const { data: existingData, error: fetchErr } = await db.from('customers').select('id, name, cpf, phone');
        if (fetchErr) throw fetchErr;

        const existingMap = new Map();
        (existingData || []).forEach((c: any) => {
            if (c.name) existingMap.set(c.name.trim().toUpperCase(), c);
        });

        const toInsert: any[] = [];
        const toUpdate: any[] = [];
        const incomingMap = new Map();

        // Deduplicate records in the incoming batch
        records.forEach(r => {
            if (!r.name) return;
            const normName = r.name.trim().toUpperCase();
            incomingMap.set(normName, r);
        });

        incomingMap.forEach((r, normName) => {
            const existing = existingMap.get(normName);

            const payload = {
                name: normName,
                cpf: r.cpf || null,
                phone: r.phone || null,
                email: r.email || null,
                gender: r.gender || 'U',
                registration_date: r.registrationDate ? r.registrationDate.toISOString() : null,
                updated_at: new Date().toISOString()
            };

            if (existing) {
                // Update only if we have new information
                toUpdate.push({ id: existing.id, ...payload });
            } else {
                toInsert.push(payload);
            }
        });

        console.log(`[Persistence] Inserting ${toInsert.length}, Updating ${toUpdate.length} customers...`);

        if (toInsert.length > 0) {
            // Batch inserts
            for (let i = 0; i < toInsert.length; i += 1000) {
                const chunk = toInsert.slice(i, i + 1000);
                const { error: insErr } = await db.from('customers').insert(chunk);
                if (insErr) {
                    console.error("Insert chunk error:", insErr.message);
                    throw new Error(`Falha ao inserir clientes: ${insErr.message}`);
                }
            }
        }

        if (toUpdate.length > 0) {
            // Batch updates using upsert on ID since we pulled the real Supabase UUIDs
            for (let i = 0; i < toUpdate.length; i += 1000) {
                const chunk = toUpdate.slice(i, i + 1000);
                const { error: upErr } = await db.from('customers').upsert(chunk, { onConflict: 'id' });
                if (upErr) {
                    console.error("Update chunk error:", upErr.message);
                    throw new Error(`Falha ao atualizar clientes: ${upErr.message}`);
                }
            }
        }

        return { success: true };
    } catch (e: any) {
        console.error("[Persistence] Failed to upsert customers:", e);
        throw e; // Throw so DashboardClient catches it and shows in UI
    }
}
