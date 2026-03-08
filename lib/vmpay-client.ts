import { VMPAY_API_BASE_URL, getVMPayCredentials, VMPayCredential, getCanonicalStoreName } from "./vmpay-config";
import { SaleRecord, CustomerRecord } from "./processing/etl";

interface EquipmentMap {
    [id: string]: { name: string, type: string }; // id -> { name, type }
}

async function fetchMachines(apiKey: string): Promise<EquipmentMap> {
    const map: EquipmentMap = {};
    try {
        let page = 0;
        const size = 1000;
        const MAX_PAGES = 50;
        while (page < MAX_PAGES) {
            let res;
            try {
                res = await fetch(`${VMPAY_API_BASE_URL}/maquinas?pagina=${page}&quantidade=${size}`, {
                    headers: { 'x-api-key': apiKey },
                    signal: AbortSignal.timeout(15000)
                });
            } catch (fetchErr: any) {
                console.error(`[VMPay Client] Fetch error for machines (Timeout/Network):`, fetchErr.message);
                break;
            }

            if (!res.ok) break;

            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) break;

            data.forEach((m: any) => {
                map[String(m.id)] = {
                    name: m.nome,
                    type: (m.tipo || '').toUpperCase()
                };
            });

            if (data.length < size) break;
            page++;
        }
    } catch (e) {
        console.error("Error fetching machines", e);
    }
    return map;
}

function toLocalVMPayDateString(date: Date): string {
    // UPDATED: VMPay API previously required BRT strings, but now operates in naked UTC strings.
    // We pass the exact UTC representation of the Date object without the 'Z'.
    return date.toISOString().replace('Z', '');
}

export async function syncVMPaySales(startDate: Date, endDate: Date, specificCred?: VMPayCredential): Promise<SaleRecord[]> {
    const salesMap = new Map<string, SaleRecord>(); // Dedup by CNPJ + ID

    const credentials = specificCred ? [specificCred] : await getVMPayCredentials();

    // We process each credential in sequence to avoid rate limiting
    for (const cred of credentials) {
        try {
            console.log(`[VMPay Client] Processing store: ${cred.name} (${cred.cnpj})`);
            const machineMap = await fetchMachines(cred.apiKey);
            console.log(`[VMPay Client] Machine map fetched: ${Object.keys(machineMap).length} machines found.`);

            // 2. Fetch Sales with Chunking (API Limit: 90 days)
            // We split into 30-day chunks to be safe
            const chunks: { start: Date, end: Date }[] = [];
            let currentStart = new Date(startDate);
            while (currentStart < endDate) {
                const chunkEnd = new Date(currentStart);
                chunkEnd.setDate(currentStart.getDate() + 30);

                const actualEnd = chunkEnd > endDate ? endDate : chunkEnd;
                chunks.push({ start: new Date(currentStart), end: new Date(actualEnd) });

                currentStart.setDate(currentStart.getDate() + 30);
            }

            for (const chunk of chunks) {
                let page = 0;
                const size = 1000; // API max

                const startStr = toLocalVMPayDateString(chunk.start);
                const endStr = toLocalVMPayDateString(chunk.end);

                console.log(`[VMPay Client] Syncing ${cred.name} chunk: ${startStr} to ${endStr}`);

                while (true) {
                    const url = `${VMPAY_API_BASE_URL}/vendas?dataInicio=${startStr}&dataTermino=${endStr}&somenteSucesso=true&pagina=${page}&quantidade=${size}`;

                    let res;
                    try {
                        res = await fetch(url, {
                            headers: { 'x-api-key': cred.apiKey },
                            signal: AbortSignal.timeout(20000) // 20 sec timeout for sales fetch
                        });
                    } catch (fetchErr: any) {
                        console.error(`[VMPay Client] Fetch error for ${cred.name} (Timeout or Network):`, fetchErr.message);
                        break; // Stop fetching this chunk on timeout
                    }

                    if (!res.ok) {
                        const errText = await res.text();
                        console.error(`[VMPay Client] Failed to fetch sales for ${cred.name}: ${res.status} ${res.statusText} - ${errText}`);
                        break;
                    }

                    const data = await res.json();

                    if (!Array.isArray(data)) {
                        console.warn(`[VMPay Client] API returned non-array data for ${cred.name} page ${page}:`, data);
                        break;
                    }

                    if (data.length === 0) {
                        console.log(`[VMPay Client] No more data for ${cred.name} at page ${page}.`);
                        break;
                    }

                    console.log(`[VMPay Client] Page ${page} received ${data.length} records for ${cred.name}. (API Key: ${cred.apiKey.substring(0, 5)}...)`);

                    for (const sale of data) {
                        // Normalize
                        const item = sale.pedido?.itens?.[0];
                        const machineNameRaw = item?.maquina || sale.equipamento || "Desconhecido";
                        const mappedObj = machineMap[String(machineNameRaw)];
                        const mappedMachineName = mappedObj ? mappedObj.name : machineNameRaw;

                        // Determine product type (wash/dry)
                        let produto = item?.tipoServico?.toUpperCase() || "LAVAGEM";

                        // Strict override if the hardware is definitively a dryer
                        if (mappedObj?.type === "SECAGEM") {
                            produto = "SECAGEM";
                        } else if (produto === "LAVAGEM" && String(mappedMachineName).toLowerCase().includes("secadora")) {
                            produto = "SECAGEM";
                        }

                        // Timezone Handling (UPDATED):
                        // VMPay now returns naked strings representing UTC time (e.g., "2026-03-08T15:54:12").
                        // We must explicitly append 'Z' so our JS Date parses it correctly as UTC.
                        let dateStr = sale.data;
                        if (dateStr && !dateStr.includes('Z') && !/[-+]\d{2}:\d{2}$/.test(dateStr)) {
                            dateStr += "Z";
                        }

                        const safeDate = new Date(dateStr);

                        // Parse ALL items
                        let items: any[] = [];
                        if (sale.pedido?.itens && Array.isArray(sale.pedido.itens)) {
                            items = sale.pedido.itens.map((i: any) => {
                                const iMachine = i.maquina || i.equipamento || "Desconhecido";
                                const iMapObj = machineMap[String(iMachine)];
                                const iName = iMapObj ? iMapObj.name : iMachine;
                                let iService = i.servico || i.tipoServico || "LAVAGEM"; // Default

                                // Strict hardware type check
                                if (iMapObj?.type === "SECAGEM") {
                                    iService = "SECAGEM";
                                } else if (String(iName).toLowerCase().includes("secadora") && iService === "LAVAGEM") {
                                    iService = "SECAGEM";
                                }

                                return {
                                    machine: iName,
                                    service: iService,
                                    status: sale.status,
                                    startTime: safeDate,
                                    value: i.valor || 0
                                };
                            });
                        }

                        // Fallback if no items array
                        if (items.length === 0) {
                            items.push({
                                machine: mappedMachineName,
                                service: produto,
                                status: sale.status,
                                startTime: safeDate,
                                value: sale.valor
                            });
                        }

                        // Parse Birth Date if available
                        let birthDate: Date | undefined = undefined;
                        let age: number | undefined = undefined;

                        if (sale.dtaNascimento) {
                            const bd = new Date(sale.dtaNascimento);
                            if (!isNaN(bd.getTime())) {
                                birthDate = bd;
                                // Calculate Age
                                const today = new Date();
                                let ageCalc = today.getFullYear() - bd.getFullYear();
                                const m = today.getMonth() - bd.getMonth();
                                if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) {
                                    ageCalc--;
                                }
                                if (ageCalc > 0 && ageCalc < 120) age = ageCalc;
                            }
                        }

                        const record: SaleRecord = {
                            id: `${cred.cnpj}-${sale.idVenda}`, // Composite ID to prevent collisions across stores
                            data: safeDate,
                            loja: getCanonicalStoreName(cred.name),
                            cliente: sale.nomeCliente || "Cliente Não Identificado",
                            customerId: sale.idCliente ? String(sale.idCliente) : undefined,
                            produto: items.length > 0 ? items[0].service : produto,
                            valor: sale.valor,
                            formaPagamento: sale.tipoPagamento || "Desconhecido",
                            tipoCartao: sale.tipoCartao || "",
                            categoriaVoucher: sale.nomeCategoriaVoucher || "",
                            desconto: (sale.valorSemDesconto || sale.valor) - sale.valor,
                            telefone: sale.telefoneCliente || "",
                            items: items,
                            originalRow: 0,
                            birthDate,
                            age
                        };

                        if (record.id) {
                            salesMap.set(record.id, record);
                        }
                    }

                    if (data.length < size) break;
                    page++;
                }
            }
        } catch (error) {
            console.error(`Error syncing ${cred.name}`, error);
        }
    }

    return Array.from(salesMap.values());
}

export async function syncVMPayCustomers(): Promise<CustomerRecord[]> {
    const customersMap = new Map<string, CustomerRecord>(); // Dedup by ID

    const credentials = await getVMPayCredentials();

    for (const cred of credentials) {
        try {
            console.log(`[VMPay Client] Syncing Customers for ${cred.name}...`);
            let page = 0;
            const size = 1000;
            const MAX_PAGES = 100;

            while (page < MAX_PAGES) {
                const url = `${VMPAY_API_BASE_URL}/clientes?pagina=${page}&quantidade=${size}`;
                const res = await fetch(url, {
                    headers: { 'x-api-key': cred.apiKey }
                });

                if (!res.ok) {
                    console.error(`[VMPay Client] Failed to fetch customers for ${cred.name}: ${res.status}`);
                    break;
                }

                const data = await res.json();
                if (!Array.isArray(data) || data.length === 0) break;

                console.log(`[VMPay Client] Page ${page} received ${data.length} customers.`);

                for (const c of data) {
                    const genderRaw = (c.genero || c.sexo || '').trim().toUpperCase();
                    let gender: 'M' | 'F' | 'U' = 'U';
                    if (genderRaw.startsWith('M') || genderRaw === 'MASCULINO') gender = 'M';
                    else if (genderRaw.startsWith('F') || genderRaw === 'FEMININO') gender = 'F';

                    const record: CustomerRecord = {
                        id: String(c.id),
                        name: c.nome.trim().toUpperCase(),
                        phone: c.telefone,
                        email: c.email,
                        cpf: c.cpf,
                        gender,
                        registrationDate: c.dataCadastro ? new Date(c.dataCadastro) : undefined,
                        originalRow: 0
                    };
                    customersMap.set(record.id!, record);
                }

                if (data.length < size) break;
                page++;
            }
        } catch (error) {
            console.error(`Error syncing customers for ${cred.name}`, error);
        }
    }

    return Array.from(customersMap.values());
}
