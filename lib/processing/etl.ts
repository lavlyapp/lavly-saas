import ExcelJS from 'exceljs';
// @ts-ignore
import Papa from 'papaparse';
import { parse, isValid } from 'date-fns';

// Force Update: ETL Parsing Logic v2.3 (Nuclear Rewrite)
export interface SaleItem {
    machine: string;
    service: string;
    status: string;

    startTime?: Date;
    value?: number;
}

export interface SaleRecord {
    id?: string;
    data: Date;
    loja: string;
    cliente: string;
    produto: string;
    valor: number;
    formaPagamento: string;
    tipoCartao: string;
    categoriaVoucher: string;
    desconto: number;
    telefone: string;
    customerId?: string; // New: Link to Customer Registry
    items?: SaleItem[]; // New: Enriched items from Pedidos
    originalRow: number;
    birthDate?: Date;
    age?: number;
}

export interface OrderRecord {
    data: Date;
    loja: string;
    cliente: string;
    machine: string;
    service: string;
    status: string;
    valor: number;
    customerId?: string; // New: Link to Customer Registry
    originalRow: number;
    birthDate?: Date;
    age?: number;
}

export interface CustomerRecord {
    id?: string;
    name: string;
    cpf?: string;
    phone?: string;
    email?: string;
    gender?: 'M' | 'F' | 'U';
    registrationDate?: Date;
    lastPurchase?: Date;
    totalSpent?: number;
    originalRow: number;
}

export interface ProcessedResult {
    type: 'sales' | 'customers'; // Expanded type
    records: SaleRecord[];
    customers?: CustomerRecord[]; // New field
    errors: string[];
    logs: string[]; // Debug logs
    summary: {
        totalSales: number;
        totalValue: number;
        startDate: Date | null;
        endDate: Date | null;
    };
}

export interface OrdersResult {
    type: 'orders';
    records: OrderRecord[];
    errors: string[];
    logs: string[]; // Debug logs
}

export type ParseResult = ProcessedResult | OrdersResult;

// Normalization Helpers
const normalizeHeader = (header: any) => {
    if (!header) return '';
    return String(header)
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9\s]/g, '') // Remove punctuation (new)
        .trim()
        .replace(/\s+/g, '_');
};

const COLUMN_MAP: Record<string, string[]> = {
    id: ['id', 'id_venda', 'venda', 'cod_venda', 'codigo', 'numero', 'requisicao', 'idvenda'],
    data: ['data', 'data_venda', 'dt_venda', 'data_emissao', 'dia', 'data_da_venda', 'dta_venda', 'dt_emis', 'emissao'],
    loja: ['loja', 'nome_loja', 'unidade', 'empresa', 'nome_fantasia', 'estabelecimento', 'lavanderia', 'filial'],
    cliente: ['cliente', 'nome_cliente', 'consumidor', 'sacado', 'nome', 'portador', 'nome_do_cliente', 'usuario', 'nome_usuario', 'nomecliente'],
    id_cliente: ['id_cliente', 'cod_cliente', 'codigo_cliente', 'id_usuario', 'customer_id', 'client_id', 'id_sacado', 'idcliente'],
    tipo_cartao: ['tipo_cartao', 'cartao_tipo', 'tipo_de_cartao', 'bandeira', 'tipo', 'cartao', 'bandeira_cartao', 'operadora', 'tipocartao'],
    categoria_voucher: ['categoria_do_voucher', 'categoria_voucher', 'tipo_voucher', 'voucher_categoria', 'voucher', 'nomecategoriavoucher'],
    desconto: ['desconto', 'valor_desconto', 'cupom', 'bonus', 'desc'],
    telefone: ['telefone', 'celular', 'whatsapp', 'contato', 'fone', 'tel', 'telemovel', 'cel', 'telefone_celular', 'tel_celular', 'celular_telefone', 'numero_telefone', 'tel.', 'cel.', 'fone.', 'contato_telefone', 'numero_celular', 'ddi_ddd_celular', 'tel_contato', 'celular_whatsapp', 'fone_res', 'fone_com', 'telefonecliente'],
    produto: ['produto', 'item', 'descricao', 'produto/servico', 'prod', 'mercadoria', 'desc_produto', 'discriminacao', 'servicos', 'itens'],
    valor: ['valor', 'valor_total', 'vlr_total', 'total', 'preco', 'valor_pago', 'valor_bruto', 'valor_liquido', 'valor_sem_desconto', 'vlr_pago', 'vl_total', 'valorsemdesconto'],
    formaPagamento: ['forma_pagamento', 'pagamento', 'metodo_pagamento', 'tipo_pagamento', 'modalidade', 'forma_de_pagamento', 'forma', 'meio_pagamento', 'tipo_recebimento', 'especie', 'tipopagamento'],
    tipoCartao: ['tipo_cartao', 'cartao_tipo', 'tipo_de_cartao', 'bandeira', 'tipo', 'cartao', 'bandeira_cartao', 'tipocartao'],
    categoriaVoucher: ['categoria_do_voucher', 'categoria_voucher', 'tipo_voucher', 'voucher_categoria', 'voucher', 'nomecategoriavoucher'],
    nascimento: ['nascimento', 'data_nascimento', 'dt_nasc', 'data_nasc', 'datanascimento', 'aniversario', 'data_de_nascimento', 'd_nasc', 'nasc', 'dt_nascimento', 'data_nascimento', 'data_de_nascimento_do_cliente', 'dtanascimento'],

    // Pedidos Specific mappings (Expanded)
    maquina: ['maquina', 'numero_da_maquina', 'id_maquina', 'cod_maquina', 'machine', 'id_machine', 'serial', 'numero_serie', 'equipamento'],
    equipamento: ['equipamento', 'equipamento_id', 'id_equipamento', 'nome_equipamento', 'equipment', 'nome_da_maquina'],
    servico: ['servico', 'tipo_de_servico', 'ciclo', 'programa', 'tipo_servico', 'nome_servico', 'service', 'cycle', 'tipo_ciclo'],
    status: ['situacao', 'status', 'estado', 'status_uso', 'state', 'condition'],

    // Customer Report Specifics
    customerName: ['nome', 'nome_cliente', 'cliente', 'nomecliente'],
    customerCpf: ['cpf', 'cpf_cnpj', 'documento', 'cpfcliente'],
    customerGender: ['genero', 'sexo'],
    customerRegDate: ['data_de_cadastro', 'data_cadastro', 'dt_cadastro', 'criado_em', 'cadastro'],
    customerEmail: ['email', 'e-mail', 'correio_eletronico', 'emailcliente'],
    customerPhone: ['telefone', 'celular', 'whatsapp', 'telefonecliente']
};

function findColumnIndex(headers: string[], field: string): number {
    const possibleDetails = COLUMN_MAP[field];
    if (!possibleDetails) return -1;
    return headers.findIndex(h => possibleDetails.includes(normalizeHeader(h)));
}

export async function parseFile(file: File): Promise<ParseResult> {
    const buffer = await file.arrayBuffer();
    const filename = file.name.toLowerCase();
    const defaultStoreName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

    if (filename.endsWith('.csv')) {
        return parseCSV(buffer, defaultStoreName);
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
        return parseExcel(buffer, defaultStoreName);
    }

    throw new Error('Formato de arquivo não suportado. Use .xlsx ou .csv');
}

// Helper to manually parse Excel date to avoid UTC shifts
function parseExcelDate(value: any): Date | null {
    if (!value) return null;

    // 0. Handle Rich Text or Object wrapper
    if (typeof value === 'object' && !(value instanceof Date)) {
        if (value.result !== undefined) value = value.result; // Formula result
        else if (value.richText) value = value.richText.map((r: any) => r.text).join('');
        else if (value.text) value = value.text; // Hyperlink
    }

    // 1. If it's already a Date object (ExcelJS parsed it)
    if (value instanceof Date) {
        return new Date(
            value.getUTCFullYear(),
            value.getUTCMonth(),
            value.getUTCDate(),
            value.getUTCHours(),
            value.getUTCMinutes(),
            value.getUTCSeconds()
        );
    }

    // 2. If it's a string
    const str = String(value).trim();
    if (!str) return null;

    // DD/MM/YYYY HH:mm
    if (str.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        const [datePart, timePart] = str.split(' ');
        const [day, month, year] = datePart.split('/').map(Number);

        let hour = 0, min = 0, sec = 0;
        if (timePart) {
            const [h, m, s] = timePart.split(':').map(Number);
            hour = h || 0;
            min = m || 0;
            sec = s || 0;
        }
        return new Date(year, month - 1, day, hour, min, sec);
    }

    // ISO-like
    if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
        return new Date(str);
    }

    return null;
}

async function parseExcel(buffer: ArrayBuffer, defaultStoreName: string): Promise<ParseResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet(1);
    const errors: string[] = [];
    const logs: string[] = [];

    logs.push(`[ETL] Started parsing file. Default Store: ${defaultStoreName}`);

    if (!worksheet || worksheet.rowCount === 0) {
        return { type: 'sales', records: [], errors: ["Planilha vazia ou sem linhas"], logs, summary: { totalSales: 0, totalValue: 0, startDate: null, endDate: null } };
    }

    // --- HEADER DETECTION ---
    let headerRowIndex = -1;

    // Sales Headers
    let idxId = -1;
    let idxData = -1;
    let idxValor = -1;
    let idxLoja = -1;
    let idxCliente = -1;
    let idxProduto = -1;
    let idxFormaPagamento = -1;
    let idxTipoCartao = -1;
    let idxCategoriaVoucher = -1;
    let idxDesconto = -1;
    let idxTelefone = -1;
    let idxNascimento = -1;
    let idxIdCliente = -1;

    // Orders Specific Headers
    let idxMaquina = -1;
    let idxServico = -1;
    let idxStatus = -1;

    // Customer Report Specific Headers
    let idxCustName = -1;
    let idxCustGender = -1;
    let idxCustRegDate = -1;
    let idxCustCpf = -1;
    let idxCustEmail = -1;
    let idxCustPhone = -1;

    let isOrdersFile = false;
    let isCustomersFile = false;
    let isRawVMPayExport = false; // Flag for internal structure
    let idxCupom = -1; // VMPay Raw specific
    let rawItemsMappingConfigured = false;

    // Split Date/Time support for Historical Exports
    let idxDateOnly = -1;
    let idxTimeOnly = -1;

    // Find Header Row (Scan first 50 rows for historical exports)
    for (let r = 1; r <= 50; r++) {
        const row = worksheet.getRow(r);
        const headers: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
            headers.push(String(cell.value || ''));
        });

        const iData = findColumnIndex(headers, 'data');
        const iHora = headers.findIndex(h => normalizeHeader(h) === 'hora'); // Explicit split time column
        const iValor = findColumnIndex(headers, 'valor');

        // Customer Check
        const iCustGender = findColumnIndex(headers, 'customerGender');
        const iCustRegDate = findColumnIndex(headers, 'customerRegDate');

        if (iCustGender > -1 && iCustRegDate > -1) {
            // Found Customer File
            headerRowIndex = r;
            isCustomersFile = true;

            idxCustName = findColumnIndex(headers, 'customerName');
            idxCustGender = iCustGender;
            idxCustRegDate = iCustRegDate;
            idxCustCpf = findColumnIndex(headers, 'customerCpf');
            idxCustEmail = findColumnIndex(headers, 'customerEmail');
            idxCustPhone = findColumnIndex(headers, 'customerPhone');

            logs.push(`[ETL] Header Found at Row ${r}. Type: CUSTOMERS`);
            break;
        }

        if (iData > -1) {
            // Potential Sales/Orders Header Found

            // Hack for specific user requirement: "Column K (10) whose title is Máquina"
            const kHeader = headers[10] ? normalizeHeader(headers[10]) : '';
            let iMaquina = -1;

            if (kHeader.includes('maquina')) {
                iMaquina = 10;
            } else {
                iMaquina = findColumnIndex(headers, 'maquina');
            }

            const iServico = findColumnIndex(headers, 'servico');

            if (iMaquina > -1 && iServico > -1) {
                isOrdersFile = true;
                headerRowIndex = r;

                idxMaquina = iMaquina;
                idxServico = iServico;
                idxStatus = findColumnIndex(headers, 'status');

                // Try to find Birth Date header
                idxNascimento = headers.findIndex(h => normalizeHeader(h).includes('nascimento'));
                if (idxNascimento === -1) {
                    idxNascimento = headers.findIndex(h => {
                        const norm = normalizeHeader(h);
                        return norm.includes('nasc') || norm.includes('aniversario');
                    });
                }
                if (idxNascimento === -1) {
                    if (headers.length > 26) {
                        const h26 = normalizeHeader(headers[26]);
                        if (h26.includes('nascimento') || h26.includes('data')) idxNascimento = 26;
                    }
                    if (idxNascimento === -1 && headers.length > 18) {
                        idxNascimento = 18;
                    }
                }

                idxData = iData;
                idxValor = iValor;
                idxLoja = findColumnIndex(headers, 'loja');
                idxCliente = findColumnIndex(headers, 'cliente');
                idxIdCliente = findColumnIndex(headers, 'id_cliente');
            } else if (iValor > -1) {
                // Determine if this is a VMPay RAW JSON-Export file format masquerading as Sales
                // VMPay RAW has 'pedido' column usually which contains JSON array of items: [{tipoServico, servico, maquina, valor...}]
                // But sometimes the raw export is flat. 
                // Let's check for VMPay specific raw keys like:
                const isRaw = headers.some(h => normalizeHeader(h) === 'creditoreal' || normalizeHeader(h) === 'idvenda' || normalizeHeader(h) === 'autorizador');

                if (isRaw) {
                    isRawVMPayExport = true;
                    // Usually VMPay Raw exports that cross all years contain BOTH Sales and Pedidos.
                    // The "pedido" column holds JSON or is empty. 
                    // However, sometimes it's flattened. 
                    // Let's treat it as a SUPER FILE.
                    isOrdersFile = false; // We process it as sales but we'll extract items from 'pedido' or 'equipamento' column
                }

                isOrdersFile = false; // Base assumption: Sales
                headerRowIndex = r;

                idxData = iData;
                idxValor = iValor;
                idxLoja = findColumnIndex(headers, 'loja');
                idxCliente = findColumnIndex(headers, 'cliente');
                idxProduto = findColumnIndex(headers, 'produto');

                if (isRawVMPayExport) {
                    // For RAW JSON Exports, the machine is in 'equipamento' AND 'pedido' has items.
                    idxMaquina = findColumnIndex(headers, 'equipamento');
                    idxProduto = findColumnIndex(headers, 'pedido'); // We map 'pedido' string containing JSON to product
                }

                idxFormaPagamento = findColumnIndex(headers, 'formaPagamento');
                idxTipoCartao = findColumnIndex(headers, 'tipoCartao');
                idxCategoriaVoucher = findColumnIndex(headers, 'categoriaVoucher');
                idxCupom = findColumnIndex(headers, 'cupom');
                idxDesconto = findColumnIndex(headers, 'desconto');
                idxTelefone = findColumnIndex(headers, 'telefone');
                idxIdCliente = findColumnIndex(headers, 'id_cliente');
                idxId = findColumnIndex(headers, 'id');

                idxNascimento = findColumnIndex(headers, 'nascimento');
                if (idxNascimento === -1) {
                    idxNascimento = headers.findIndex(h => {
                        const norm = normalizeHeader(h);
                        return norm.includes('nasc') || norm.includes('aniversario');
                    });
                }
                if (idxNascimento === -1 && headers.length > 18) {
                    idxNascimento = 18;
                }
            }

            if (headerRowIndex > -1) {
                // If we found a split date/time, register it
                if (iData > -1 && iHora > -1) {
                    idxDateOnly = iData;
                    idxTimeOnly = iHora;
                    logs.push(`[ETL] Detected Split Date/Time columns. Date:${idxDateOnly}, Time:${idxTimeOnly}`);
                }

                logs.push(`[ETL] Header Found at Row ${r}. Type: ${isOrdersFile ? 'ORDERS' : (isRawVMPayExport ? 'RAW_VMPAY' : 'SALES')}`);
                break;
            }
        }
    }

    if (headerRowIndex === -1) {
        errors.push("Cabeçalho não identificado.");
        logs.push("[ETL] Falha: Cabeçalho não encontrado nas primeiras 50 linhas.");
        return { type: 'sales', records: [], errors, logs, summary: { totalSales: 0, totalValue: 0, startDate: null, endDate: null } };
    }

    // --- DATA PARSING ---
    const salesRecords: SaleRecord[] = [];
    const orderRecords: OrderRecord[] = [];
    const customerRecords: CustomerRecord[] = [];

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowIndex) return;

        try {
            if (isCustomersFile) {
                // CUSTOMER PARSING LOGIC
                const name = idxCustName > -1 ? String(row.getCell(idxCustName + 1).value || '').trim() : '';

                // Skip invalid rows
                if (!name || name.length < 2) return;

                const cpfRaw = idxCustCpf > -1 ? String(row.getCell(idxCustCpf + 1).value || '').trim() : '';
                const cpf = cpfRaw.replace(/[^0-9]/g, '');

                const genderRaw = idxCustGender > -1 ? String(row.getCell(idxCustGender + 1).value || '').trim().toUpperCase() : '';
                let gender: 'M' | 'F' | 'U' = 'U';
                if (genderRaw.startsWith('M') || genderRaw === 'MASCULINO') gender = 'M';
                else if (genderRaw.startsWith('F') || genderRaw === 'FEMININO') gender = 'F';

                const regDateRaw = idxCustRegDate > -1 ? row.getCell(idxCustRegDate + 1).value : null;
                const registrationDate = parseExcelDate(regDateRaw) || undefined;

                const email = idxCustEmail > -1 ? String(row.getCell(idxCustEmail + 1).value || '').trim() : undefined;
                let phone = idxCustPhone > -1 ? String(row.getCell(idxCustPhone + 1).value || '').trim() : undefined;
                if (phone) phone = phone.replace(/[^0-9]/g, '');

                customerRecords.push({
                    name,
                    cpf,
                    gender,
                    registrationDate,
                    email,
                    phone,
                    originalRow: rowNumber
                });

            } else {
                // DEFAULT SALES/ORDERS LOGIC
                // Combine Date and Time if they are split
                let date: Date | null = null;

                if (idxDateOnly > -1 && idxTimeOnly > -1) {
                    const rawDate = row.getCell(idxDateOnly + 1).value;
                    const rawTime = row.getCell(idxTimeOnly + 1).value;

                    const parsedD = parseExcelDate(rawDate);
                    const parsedT = parseExcelDate(rawTime);

                    if (parsedD && parsedT) {
                        date = new Date(
                            parsedD.getFullYear(),
                            parsedD.getMonth(),
                            parsedD.getDate(),
                            parsedT.getHours(),
                            parsedT.getMinutes(),
                            parsedT.getSeconds()
                        );
                    } else {
                        date = parsedD; // Fallback to just date if time is unparseable
                    }
                } else {
                    const rawData = idxData > -1 ? row.getCell(idxData + 1).value : null;
                    date = parseExcelDate(rawData);
                }

                // Value Parsing
                let valor = 0;
                const rawValor = idxValor > -1 ? row.getCell(idxValor + 1).value : null;
                if (typeof rawValor === 'number') {
                    valor = rawValor;
                } else if (typeof rawValor === 'string') {
                    // Correctly handle Brazilian currency: "1.500,00" -> 1500.00
                    valor = parseFloat(rawValor.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
                }

                if (date && isValid(date)) {
                    const loja = idxLoja > -1 ? String(row.getCell(idxLoja + 1).value || '').trim() : defaultStoreName;
                    const cliente = idxCliente > -1 ? String(row.getCell(idxCliente + 1).value || '').trim() : '';

                    if (isOrdersFile) {
                        // PARSE ORDER RECORD
                        let birthDate: Date | undefined = undefined;
                        let age: number | undefined = undefined;

                        if (idxNascimento > -1) {
                            const rawBirth = row.getCell(idxNascimento + 1).value;
                            const parsedBirth = parseExcelDate(rawBirth);
                            if (parsedBirth && isValid(parsedBirth)) {
                                birthDate = parsedBirth;
                                // Calculate Age
                                const today = new Date();
                                let ageCalc = today.getFullYear() - parsedBirth.getFullYear();
                                const m = today.getMonth() - parsedBirth.getMonth();
                                if (m < 0 || (m === 0 && today.getDate() < parsedBirth.getDate())) {
                                    ageCalc--;
                                }
                                if (ageCalc > 0 && ageCalc < 120) age = ageCalc;
                            }
                        }

                        orderRecords.push({
                            data: date,
                            loja: loja || defaultStoreName,
                            cliente,
                            valor,
                            machine: idxMaquina > -1 ? String(row.getCell(idxMaquina + 1).value || '') : '',
                            service: idxServico > -1 ? String(row.getCell(idxServico + 1).value || '') : '',
                            status: idxStatus > -1 ? String(row.getCell(idxStatus + 1).value || '') : 'Unknown',
                            customerId: idxIdCliente > -1 ? String(row.getCell(idxIdCliente + 1).value || '') : undefined,
                            originalRow: rowNumber,
                            birthDate,
                            age
                        });

                    } else {
                        // PARSE SALES RECORD
                        let telefone = idxTelefone > -1 ? String(row.getCell(idxTelefone + 1).value || '').trim() : '';
                        if (telefone) telefone = telefone.replace(/[^0-9+\-\s]/g, '');

                        const produto = idxProduto > -1 ? String(row.getCell(idxProduto + 1).value || '').trim() : '';
                        const formaPagamento = idxFormaPagamento > -1 ? String(row.getCell(idxFormaPagamento + 1).value || 'Outros') : 'Outros';

                        // Birth Date Extraction (Sales)
                        let birthDate: Date | undefined = undefined;
                        let age: number | undefined = undefined;

                        if (idxNascimento > -1) {
                            const rawBirth = row.getCell(idxNascimento + 1).value;
                            const parsedBirth = parseExcelDate(rawBirth);
                            if (parsedBirth && isValid(parsedBirth)) {
                                birthDate = parsedBirth;
                                // Calculate Age
                                const today = new Date();
                                let ageCalc = today.getFullYear() - parsedBirth.getFullYear();
                                const m = today.getMonth() - parsedBirth.getMonth();
                                if (m < 0 || (m === 0 && today.getDate() < parsedBirth.getDate())) {
                                    ageCalc--;
                                }
                                if (ageCalc > 0 && ageCalc < 120) age = ageCalc;
                            }
                        }

                        // Composite ID Logic
                        let id = '';
                        if (idxId > -1) {
                            const rawId = String(row.getCell(idxId + 1).value || '').trim();
                            if (rawId && rawId !== 'null') {
                                id = `${loja}-${rawId}`;
                            }
                        }

                        if (!id) {
                            // Use row number or content hash to ensure uniqueness if ID is missing
                            // Using a simple composite of date-client-value
                            const dateStr = date.toISOString();
                            id = `${loja}_${dateStr}_${cliente}_${valor.toFixed(2)}`;
                        }

                        // PARSE RAW VMPAY PEDIDO JSON
                        const parsedItems: SaleItem[] = [];
                        let desconto = 0;
                        if (isRawVMPayExport && idxCupom > -1) {
                            const cupomStr = String(row.getCell(idxCupom + 1).value || '').trim();
                            if (cupomStr.includes('valor')) {
                                try {
                                    const cupomObj = JSON.parse(cupomStr);
                                    desconto = cupomObj.valor || 0;
                                } catch (e) { }
                            }
                        }

                        if (isRawVMPayExport && idxProduto > -1) {
                            const rawPedidoObj = row.getCell(idxProduto + 1).value;
                            if (rawPedidoObj && typeof rawPedidoObj === 'string' && rawPedidoObj.includes('{"itens":[')) {
                                try {
                                    const pedidoData = JSON.parse(rawPedidoObj);
                                    if (pedidoData && pedidoData.itens && Array.isArray(pedidoData.itens)) {
                                        pedidoData.itens.forEach((subItem: any) => {
                                            if (subItem.maquina || subItem.servico) {
                                                parsedItems.push({
                                                    machine: subItem.maquina || '',
                                                    service: subItem.servico || subItem.tipoServico || 'Unknown',
                                                    status: 'SUCESSO', // assumed for sales export
                                                    startTime: date,
                                                    value: subItem.valor || valor
                                                });
                                            }
                                        });
                                    }
                                } catch (e) {
                                    // if it's not valid JSON, ignore
                                }
                            }
                        }

                        // If still no items, but we have a machine (equipamento column), create a dummy item
                        if (parsedItems.length === 0 && idxMaquina > -1) {
                            const equipamento = String(row.getCell(idxMaquina + 1).value || '').trim();
                            if (equipamento && equipamento.length > 1) {
                                parsedItems.push({
                                    machine: equipamento,
                                    service: produto || 'Unknown',
                                    status: 'SUCESSO',
                                    startTime: date,
                                    value: valor
                                });
                            }
                        }

                        salesRecords.push({
                            id,
                            data: date,
                            loja: loja || defaultStoreName,
                            cliente,
                            customerId: idxIdCliente > -1 ? String(row.getCell(idxIdCliente + 1).value || '') : undefined,
                            telefone,
                            originalRow: rowNumber,
                            produto: isRawVMPayExport ? (parsedItems.length > 0 ? parsedItems[0].service : 'RAW_EXPORT') : produto,
                            valor,
                            formaPagamento,
                            tipoCartao: idxTipoCartao > -1 ? String(row.getCell(idxTipoCartao + 1).value || '') : '',
                            categoriaVoucher: idxCategoriaVoucher > -1 ? String(row.getCell(idxCategoriaVoucher + 1).value || '') : '',
                            desconto,
                            items: parsedItems,
                            birthDate,
                            age
                        });
                    }
                }
            }
        } catch (e: any) {
            // Silent fail
        }
    });

    logs.push(`[ETL] Parsing Complete. Generated ${isOrdersFile ? orderRecords.length : (isCustomersFile ? customerRecords.length : salesRecords.length)} records.`);

    if (isCustomersFile) {
        return {
            type: 'customers',
            records: [], // Empty sales records
            customers: customerRecords,
            errors,
            logs,
            summary: { totalSales: 0, totalValue: 0, startDate: null, endDate: null }
        };
    } else if (isOrdersFile) {
        return {
            type: 'orders',
            records: orderRecords,
            errors,
            logs
        };
    } else {
        if (salesRecords.length === 0 && errors.length === 0) {
            errors.push(`Nenhum registro encontrado. Header na linha ${headerRowIndex}.`);
        }
        return calculateSummary(salesRecords, errors, logs);
    }
}

async function parseCSV(buffer: ArrayBuffer, defaultStoreName: string): Promise<ParseResult> {
    const text = new TextDecoder('utf-8').decode(buffer);
    const errors: string[] = [];
    const logs: string[] = [];

    logs.push(`[ETL] Started parsing CSV file. Default Store: ${defaultStoreName}`);

    return new Promise((resolve) => {
        Papa.parse(text, {
            header: false,
            skipEmptyLines: true,
            complete: (results: any) => {
                const rows = results.data;
                if (!rows || rows.length === 0) {
                    return resolve({ type: 'sales', records: [], errors: ["CSV vazio"], logs, summary: { totalSales: 0, totalValue: 0, startDate: null, endDate: null } });
                }

                // --- HEADER DETECTION ---
                let headerRowIndex = -1;
                let isOrdersFile = false;
                let isCustomersFile = false;
                let isRawVMPayExport = false;

                let idxId = -1, idxData = -1, idxValor = -1, idxLoja = -1, idxCliente = -1, idxProduto = -1;
                let idxFormaPagamento = -1, idxTipoCartao = -1, idxCategoriaVoucher = -1, idxDesconto = -1;
                let idxTelefone = -1, idxNascimento = -1, idxIdCliente = -1, idxMaquina = -1, idxServico = -1, idxStatus = -1;
                let idxDateOnly = -1, idxTimeOnly = -1, idxCupom = -1;

                let idxCustName = -1, idxCustGender = -1, idxCustRegDate = -1, idxCustCpf = -1, idxCustEmail = -1, idxCustPhone = -1;

                // Scan first 50 rows for headers
                for (let r = 0; r < Math.min(rows.length, 50); r++) {
                    const headers = rows[r].map((h: any) => String(h || ''));
                    const iData = findColumnIndex(headers, 'data');
                    const iHora = headers.findIndex((h: any) => normalizeHeader(h) === 'hora');
                    const iValor = findColumnIndex(headers, 'valor');

                    const iCustGender = findColumnIndex(headers, 'customerGender');
                    const iCustRegDate = findColumnIndex(headers, 'customerRegDate');

                    if (iCustGender > -1 && iCustRegDate > -1) {
                        headerRowIndex = r;
                        isCustomersFile = true;
                        idxCustName = findColumnIndex(headers, 'customerName');
                        idxCustGender = iCustGender;
                        idxCustRegDate = iCustRegDate;
                        idxCustCpf = findColumnIndex(headers, 'customerCpf');
                        idxCustEmail = findColumnIndex(headers, 'customerEmail');
                        idxCustPhone = findColumnIndex(headers, 'customerPhone');
                        logs.push(`[ETL CSV] Header Found at Row ${r}. Type: CUSTOMERS`);
                        break;
                    }

                    if (iData > -1) {
                        const iMaquina = findColumnIndex(headers, 'maquina');
                        const iServico = findColumnIndex(headers, 'servico');

                        if (iMaquina > -1 && iServico > -1) {
                            isOrdersFile = true;
                            headerRowIndex = r;
                            idxMaquina = iMaquina;
                            idxServico = iServico;
                            idxStatus = findColumnIndex(headers, 'status');

                            idxNascimento = findColumnIndex(headers, 'nascimento');
                            if (idxNascimento === -1) {
                                idxNascimento = headers.findIndex((h: any) => {
                                    const norm = normalizeHeader(h);
                                    return norm.includes('nasc') || norm.includes('aniversario');
                                });
                            }

                            idxData = iData;
                            idxValor = iValor;
                            idxLoja = findColumnIndex(headers, 'loja');
                            idxCliente = findColumnIndex(headers, 'cliente');
                            idxIdCliente = findColumnIndex(headers, 'id_cliente');
                        } else if (iValor > -1) {
                            const isRaw = headers.some((h: string) => normalizeHeader(h) === 'creditoreal' || normalizeHeader(h) === 'idvenda' || normalizeHeader(h) === 'autorizador');
                            if (isRaw) isRawVMPayExport = true;

                            isOrdersFile = false;
                            headerRowIndex = r;

                            idxData = iData;
                            idxValor = iValor;
                            idxLoja = findColumnIndex(headers, 'loja');
                            idxCliente = findColumnIndex(headers, 'cliente');
                            idxProduto = findColumnIndex(headers, 'produto');

                            if (isRawVMPayExport) {
                                idxMaquina = findColumnIndex(headers, 'equipamento');
                                idxProduto = findColumnIndex(headers, 'pedido');
                            }

                            idxFormaPagamento = findColumnIndex(headers, 'formaPagamento');
                            idxTipoCartao = findColumnIndex(headers, 'tipoCartao');
                            idxCategoriaVoucher = findColumnIndex(headers, 'categoriaVoucher');
                            idxCupom = findColumnIndex(headers, 'cupom');
                            idxDesconto = findColumnIndex(headers, 'desconto');
                            idxTelefone = findColumnIndex(headers, 'telefone');
                            idxIdCliente = findColumnIndex(headers, 'id_cliente');
                            idxId = findColumnIndex(headers, 'id');

                            idxNascimento = findColumnIndex(headers, 'nascimento');
                            if (idxNascimento === -1) {
                                idxNascimento = headers.findIndex((h: any) => {
                                    const norm = normalizeHeader(h);
                                    return norm.includes('nasc') || norm.includes('aniversario');
                                });
                            }
                        }

                        if (headerRowIndex > -1) {
                            if (iData > -1 && iHora > -1) {
                                idxDateOnly = iData;
                                idxTimeOnly = iHora;
                            }
                            logs.push(`[ETL CSV] Header Found at Row ${r}. Type: ${isOrdersFile ? 'ORDERS' : (isRawVMPayExport ? 'RAW_VMPAY' : 'SALES')}`);
                            break;
                        }
                    }
                }

                if (headerRowIndex === -1) {
                    errors.push("Cabeçalho não identificado.");
                    logs.push("[ETL CSV] Falha: Cabeçalho não encontrado.");
                    return resolve({ type: 'sales', records: [], errors, logs, summary: { totalSales: 0, totalValue: 0, startDate: null, endDate: null } });
                }

                const salesRecords: SaleRecord[] = [];
                const orderRecords: OrderRecord[] = [];
                const customerRecords: CustomerRecord[] = [];

                for (let r = headerRowIndex + 1; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || row.length === 0) continue;

                    try {
                        if (isCustomersFile) {
                            // ... simple mapping
                            const name = idxCustName > -1 ? String(row[idxCustName] || '').trim() : '';
                            if (!name || name.length < 2) continue;

                            const cpfRaw = idxCustCpf > -1 ? String(row[idxCustCpf] || '').trim() : '';
                            const cpf = cpfRaw.replace(/[^0-9]/g, '');

                            const genderRaw = idxCustGender > -1 ? String(row[idxCustGender] || '').trim().toUpperCase() : '';
                            let gender: 'M' | 'F' | 'U' = 'U';
                            if (genderRaw.startsWith('M') || genderRaw === 'MASCULINO') gender = 'M';
                            else if (genderRaw.startsWith('F') || genderRaw === 'FEMININO') gender = 'F';

                            const regDateRaw = idxCustRegDate > -1 ? row[idxCustRegDate] : null;
                            const registrationDate = parseExcelDate(regDateRaw) || undefined;

                            const email = idxCustEmail > -1 ? String(row[idxCustEmail] || '').trim() : undefined;
                            let phone = idxCustPhone > -1 ? String(row[idxCustPhone] || '').trim() : undefined;
                            if (phone) phone = phone.replace(/[^0-9]/g, '');

                            customerRecords.push({ name, cpf, gender, registrationDate, email, phone, originalRow: r });
                        } else {
                            let date: Date | null = null;
                            if (idxDateOnly > -1 && idxTimeOnly > -1) {
                                const parsedD = parseExcelDate(row[idxDateOnly]);
                                const parsedT = parseExcelDate(row[idxTimeOnly]);
                                if (parsedD && parsedT) {
                                    date = new Date(parsedD.getFullYear(), parsedD.getMonth(), parsedD.getDate(), parsedT.getHours(), parsedT.getMinutes(), parsedT.getSeconds());
                                } else {
                                    date = parsedD;
                                }
                            } else {
                                date = parseExcelDate(idxData > -1 ? row[idxData] : null);
                            }

                            let valor = 0;
                            const rawValor = idxValor > -1 ? row[idxValor] : null;
                            if (typeof rawValor === 'string') {
                                // Correctly handle Brazilian currency: "1.500,00" -> 1500.00
                                valor = parseFloat(rawValor.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
                            } else if (typeof rawValor === 'number') {
                                valor = rawValor;
                            }

                            if (date && isValid(date)) {
                                const loja = idxLoja > -1 ? String(row[idxLoja] || '').trim() : defaultStoreName;
                                const cliente = idxCliente > -1 ? String(row[idxCliente] || '').trim() : '';

                                if (isOrdersFile) {
                                    let birthDate: Date | undefined = undefined;
                                    let age: number | undefined = undefined;
                                    if (idxNascimento > -1) {
                                        const parsedBirth = parseExcelDate(row[idxNascimento]);
                                        if (parsedBirth && isValid(parsedBirth)) {
                                            birthDate = parsedBirth;
                                            const today = new Date();
                                            let ageCalc = today.getFullYear() - parsedBirth.getFullYear();
                                            if (today.getMonth() < parsedBirth.getMonth() || (today.getMonth() === parsedBirth.getMonth() && today.getDate() < parsedBirth.getDate())) ageCalc--;
                                            if (ageCalc > 0 && ageCalc < 120) age = ageCalc;
                                        }
                                    }

                                    orderRecords.push({
                                        data: date,
                                        loja: loja || defaultStoreName,
                                        cliente,
                                        valor,
                                        machine: idxMaquina > -1 ? String(row[idxMaquina] || '') : '',
                                        service: idxServico > -1 ? String(row[idxServico] || '') : '',
                                        status: idxStatus > -1 ? String(row[idxStatus] || '') : 'Unknown',
                                        customerId: idxIdCliente > -1 ? String(row[idxIdCliente] || '') : undefined,
                                        originalRow: r,
                                        birthDate,
                                        age
                                    });
                                } else {
                                    let telefone = idxTelefone > -1 ? String(row[idxTelefone] || '').trim() : '';
                                    if (telefone) telefone = telefone.replace(/[^0-9+\-\s]/g, '');
                                    const produto = idxProduto > -1 ? String(row[idxProduto] || '').trim() : '';
                                    const formaPagamento = idxFormaPagamento > -1 ? String(row[idxFormaPagamento] || 'Outros') : 'Outros';

                                    let birthDate: Date | undefined = undefined;
                                    let age: number | undefined = undefined;
                                    if (idxNascimento > -1) {
                                        const parsedBirth = parseExcelDate(row[idxNascimento]);
                                        if (parsedBirth && isValid(parsedBirth)) {
                                            birthDate = parsedBirth;
                                            const today = new Date();
                                            let ageCalc = today.getFullYear() - parsedBirth.getFullYear();
                                            if (today.getMonth() < parsedBirth.getMonth() || (today.getMonth() === parsedBirth.getMonth() && today.getDate() < parsedBirth.getDate())) ageCalc--;
                                            if (ageCalc > 0 && ageCalc < 120) age = ageCalc;
                                        }
                                    }

                                    let id = idxId > -1 ? String(row[idxId] || '').trim() : '';
                                    if (id && id !== 'null') id = `${loja}-${id}`;
                                    if (!id) id = `${loja}_${date.toISOString()}_${cliente}_${valor.toFixed(2)}`;

                                    const parsedItems: SaleItem[] = [];
                                    let desconto = 0;
                                    if (isRawVMPayExport && idxCupom > -1) {
                                        const cupomStr = String(row[idxCupom] || '').trim();
                                        if (cupomStr.includes('valor')) { try { desconto = JSON.parse(cupomStr).valor || 0; } catch (e) { } }
                                    }

                                    if (isRawVMPayExport && idxProduto > -1) {
                                        const rawPedidoObj = String(row[idxProduto] || '');
                                        if (rawPedidoObj.includes('{"itens":[')) {
                                            try {
                                                const pedidoData = JSON.parse(rawPedidoObj);
                                                if (pedidoData && pedidoData.itens && Array.isArray(pedidoData.itens)) {
                                                    pedidoData.itens.forEach((subItem: any) => {
                                                        if (subItem.maquina || subItem.servico) {
                                                            parsedItems.push({ machine: subItem.maquina || '', service: subItem.servico || subItem.tipoServico || 'Unknown', status: 'SUCESSO', startTime: date, value: subItem.valor || valor });
                                                        }
                                                    });
                                                }
                                            } catch (e) { }
                                        }
                                    }

                                    if (parsedItems.length === 0 && idxMaquina > -1) {
                                        const equipamento = String(row[idxMaquina] || '').trim();
                                        if (equipamento.length > 1) parsedItems.push({ machine: equipamento, service: produto || 'Unknown', status: 'SUCESSO', startTime: date, value: valor });
                                    }

                                    salesRecords.push({
                                        id, data: date, loja: loja || defaultStoreName, cliente,
                                        customerId: idxIdCliente > -1 ? String(row[idxIdCliente] || '') : undefined,
                                        telefone, originalRow: r,
                                        produto: isRawVMPayExport ? (parsedItems.length > 0 ? parsedItems[0].service : 'RAW_EXPORT') : produto,
                                        valor, formaPagamento,
                                        tipoCartao: idxTipoCartao > -1 ? String(row[idxTipoCartao] || '') : '',
                                        categoriaVoucher: idxCategoriaVoucher > -1 ? String(row[idxCategoriaVoucher] || '') : '',
                                        desconto, items: parsedItems, birthDate, age
                                    });
                                }
                            }
                        }
                    } catch (e) { }
                }

                logs.push(`[ETL CSV] Parsing Complete. Generated ${isOrdersFile ? orderRecords.length : (isCustomersFile ? customerRecords.length : salesRecords.length)} records.`);

                if (isCustomersFile) {
                    resolve({ type: 'customers', records: [], customers: customerRecords, errors, logs, summary: { totalSales: 0, totalValue: 0, startDate: null, endDate: null } });
                } else if (isOrdersFile) {
                    resolve({ type: 'orders', records: orderRecords, errors, logs });
                } else {
                    if (salesRecords.length === 0 && errors.length === 0) errors.push(`Nenhum registro encontrado. Header na linha ${headerRowIndex}.`);
                    resolve(calculateSummary(salesRecords, errors, logs));
                }
            }
        });
    });
}

function calculateSummary(records: SaleRecord[], errors: string[], logs: string[]): ProcessedResult {
    const totalSales = records.length;
    const totalValue = records.reduce((acc, r) => acc + r.valor, 0);
    const sorted = [...records].sort((a, b) => a.data.getTime() - b.data.getTime());

    return {
        type: 'sales',
        records,
        errors,
        logs,
        summary: {
            totalSales,
            totalValue,
            startDate: sorted.length > 0 ? sorted[0].data : null,
            endDate: sorted.length > 0 ? sorted[sorted.length - 1].data : null
        }
    };
}
