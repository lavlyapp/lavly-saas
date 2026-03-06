"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFile = parseFile;
var exceljs_1 = __importDefault(require("exceljs"));
// @ts-ignore
var papaparse_1 = __importDefault(require("papaparse"));
var date_fns_1 = require("date-fns");
var vmpay_config_1 = require("../vmpay-config");
// Normalization Helpers
var normalizeHeader = function (header) {
    if (!header)
        return '';
    return String(header)
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9\s]/g, '') // Remove punctuation (new)
        .trim()
        .replace(/\s+/g, '_');
};
var COLUMN_MAP = {
    id: ['id', 'id_venda', 'venda', 'cod_venda', 'codigo', 'numero', 'requisicao', 'idvenda'],
    data: ['data', 'data_venda', 'dt_venda', 'data_emissao', 'dia', 'data_da_venda', 'dta_venda', 'dt_emis', 'emissao'],
    loja: ['lavanderia', 'unidade', 'loja', 'nome_loja', 'empresa', 'nome_fantasia', 'estabelecimento', 'filial'],
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
function findColumnIndex(headers, field) {
    var possibleDetails = COLUMN_MAP[field];
    if (!possibleDetails)
        return -1;
    return headers.findIndex(function (h) { return possibleDetails.includes(normalizeHeader(h)); });
}
function parseFile(file) {
    return __awaiter(this, void 0, void 0, function () {
        var buffer, filename, rawDefaultStoreName, defaultStoreName;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file.arrayBuffer()];
                case 1:
                    buffer = _a.sent();
                    filename = file.name.toLowerCase();
                    rawDefaultStoreName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
                    defaultStoreName = (0, vmpay_config_1.getCanonicalStoreName)(rawDefaultStoreName);
                    if (filename.endsWith('.csv')) {
                        return [2 /*return*/, parseCSV(buffer, defaultStoreName)];
                    }
                    else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
                        return [2 /*return*/, parseExcel(buffer, defaultStoreName)];
                    }
                    throw new Error('Formato de arquivo não suportado. Use .xlsx ou .csv');
            }
        });
    });
}
// Helper to manually parse Excel date to avoid UTC shifts
function parseExcelDate(value) {
    if (!value)
        return null;
    // 0. Handle Rich Text or Object wrapper
    if (typeof value === 'object' && !(value instanceof Date)) {
        if (value.result !== undefined)
            value = value.result; // Formula result
        else if (value.richText)
            value = value.richText.map(function (r) { return r.text; }).join('');
        else if (value.text)
            value = value.text; // Hyperlink
    }
    // 1. If it's already a Date object (ExcelJS parsed it)
    if (value instanceof Date) {
        return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds());
    }
    // 2. If it's a string
    var str = String(value).trim();
    if (!str)
        return null;
    // DD/MM/YYYY HH:mm
    if (str.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        var _a = str.split(' '), datePart = _a[0], timePart = _a[1];
        var _b = datePart.split('/').map(Number), day = _b[0], month = _b[1], year = _b[2];
        var hour = 0, min = 0, sec = 0;
        if (timePart) {
            var _c = timePart.split(':').map(Number), h = _c[0], m = _c[1], s = _c[2];
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
function parseExcel(buffer, defaultStoreName) {
    return __awaiter(this, void 0, void 0, function () {
        var workbook, worksheet, errors, logs, headerRowIndex, idxId, idxData, idxValor, idxLoja, idxCliente, idxProduto, idxFormaPagamento, idxTipoCartao, idxCategoriaVoucher, idxDesconto, idxTelefone, idxNascimento, idxIdCliente, idxMaquina, idxServico, idxStatus, idxCustName, idxCustGender, idxCustRegDate, idxCustCpf, idxCustEmail, idxCustPhone, isOrdersFile, isCustomersFile, isRawVMPayExport, idxCupom, rawItemsMappingConfigured, idxDateOnly, idxTimeOnly, _loop_1, r, state_1, salesRecords, orderRecords, customerRecords;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workbook = new exceljs_1.default.Workbook();
                    return [4 /*yield*/, workbook.xlsx.load(buffer)];
                case 1:
                    _a.sent();
                    worksheet = workbook.getWorksheet(1);
                    errors = [];
                    logs = [];
                    logs.push("[ETL] Started parsing file. Default Store: ".concat(defaultStoreName));
                    if (!worksheet || worksheet.rowCount === 0) {
                        return [2 /*return*/, { type: 'sales', records: [], errors: ["Planilha vazia ou sem linhas"], logs: logs, summary: { totalSales: 0, totalValue: 0, startDate: null, endDate: null } }];
                    }
                    headerRowIndex = -1;
                    idxId = -1;
                    idxData = -1;
                    idxValor = -1;
                    idxLoja = -1;
                    idxCliente = -1;
                    idxProduto = -1;
                    idxFormaPagamento = -1;
                    idxTipoCartao = -1;
                    idxCategoriaVoucher = -1;
                    idxDesconto = -1;
                    idxTelefone = -1;
                    idxNascimento = -1;
                    idxIdCliente = -1;
                    idxMaquina = -1;
                    idxServico = -1;
                    idxStatus = -1;
                    idxCustName = -1;
                    idxCustGender = -1;
                    idxCustRegDate = -1;
                    idxCustCpf = -1;
                    idxCustEmail = -1;
                    idxCustPhone = -1;
                    isOrdersFile = false;
                    isCustomersFile = false;
                    isRawVMPayExport = false;
                    idxCupom = -1;
                    rawItemsMappingConfigured = false;
                    idxDateOnly = -1;
                    idxTimeOnly = -1;
                    _loop_1 = function (r) {
                        var row = worksheet.getRow(r);
                        var headers = [];
                        row.eachCell({ includeEmpty: true }, function (cell) {
                            headers.push(String(cell.value || ''));
                        });
                        var iData = findColumnIndex(headers, 'data');
                        var iHora = headers.findIndex(function (h) { return normalizeHeader(h) === 'hora'; }); // Explicit split time column
                        var iValor = findColumnIndex(headers, 'valor');
                        // Customer Check
                        var iCustGender = findColumnIndex(headers, 'customerGender');
                        var iCustRegDate = findColumnIndex(headers, 'customerRegDate');
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
                            logs.push("[ETL] Header Found at Row ".concat(r, ". Type: CUSTOMERS"));
                            return "break";
                        }
                        if (iData > -1) {
                            // Potential Sales/Orders Header Found
                            // Hack for specific user requirement: "Column K (10) whose title is Máquina"
                            var kHeader = headers[10] ? normalizeHeader(headers[10]) : '';
                            var iMaquina = -1;
                            if (kHeader.includes('maquina')) {
                                iMaquina = 10;
                            }
                            else {
                                iMaquina = findColumnIndex(headers, 'maquina');
                            }
                            var iServico = findColumnIndex(headers, 'servico');
                            if (iMaquina > -1 && iServico > -1) {
                                isOrdersFile = true;
                                headerRowIndex = r;
                                idxMaquina = iMaquina;
                                idxServico = iServico;
                                idxStatus = findColumnIndex(headers, 'status');
                                // Try to find Birth Date header
                                idxNascimento = headers.findIndex(function (h) { return normalizeHeader(h).includes('nascimento'); });
                                if (idxNascimento === -1) {
                                    idxNascimento = headers.findIndex(function (h) {
                                        var norm = normalizeHeader(h);
                                        return norm.includes('nasc') || norm.includes('aniversario');
                                    });
                                }
                                if (idxNascimento === -1) {
                                    if (headers.length > 26) {
                                        var h26 = normalizeHeader(headers[26]);
                                        if (h26.includes('nascimento') || h26.includes('data'))
                                            idxNascimento = 26;
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
                            }
                            else if (iValor > -1) {
                                // Determine if this is a VMPay RAW JSON-Export file format masquerading as Sales
                                // VMPay RAW has 'pedido' column usually which contains JSON array of items: [{tipoServico, servico, maquina, valor...}]
                                // But sometimes the raw export is flat. 
                                // Let's check for VMPay specific raw keys like:
                                var isRaw = headers.some(function (h) { return normalizeHeader(h) === 'creditoreal' || normalizeHeader(h) === 'idvenda' || normalizeHeader(h) === 'autorizador'; });
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
                                    idxNascimento = headers.findIndex(function (h) {
                                        var norm = normalizeHeader(h);
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
                                    logs.push("[ETL] Detected Split Date/Time columns. Date:".concat(idxDateOnly, ", Time:").concat(idxTimeOnly));
                                }
                                logs.push("[ETL] Header Found at Row ".concat(r, ". Type: ").concat(isOrdersFile ? 'ORDERS' : (isRawVMPayExport ? 'RAW_VMPAY' : 'SALES')));
                                return "break";
                            }
                        }
                    };
                    // Find Header Row (Scan first 50 rows for historical exports)
                    for (r = 1; r <= 50; r++) {
                        state_1 = _loop_1(r);
                        if (state_1 === "break")
                            break;
                    }
                    if (headerRowIndex === -1) {
                        errors.push("Cabeçalho não identificado.");
                        logs.push("[ETL] Falha: Cabeçalho não encontrado nas primeiras 50 linhas.");
                        return [2 /*return*/, { type: 'sales', records: [], errors: errors, logs: logs, summary: { totalSales: 0, totalValue: 0, startDate: null, endDate: null } }];
                    }
                    salesRecords = [];
                    orderRecords = [];
                    customerRecords = [];
                    worksheet.eachRow(function (row, rowNumber) {
                        if (rowNumber <= headerRowIndex)
                            return;
                        try {
                            if (isCustomersFile) {
                                // CUSTOMER PARSING LOGIC
                                var name_1 = idxCustName > -1 ? String(row.getCell(idxCustName + 1).value || '').trim() : '';
                                // Skip invalid rows
                                if (!name_1 || name_1.length < 2)
                                    return;
                                var cpfRaw = idxCustCpf > -1 ? String(row.getCell(idxCustCpf + 1).value || '').trim() : '';
                                var cpf = cpfRaw.replace(/[^0-9]/g, '');
                                var genderRaw = idxCustGender > -1 ? String(row.getCell(idxCustGender + 1).value || '').trim().toUpperCase() : '';
                                var gender = 'U';
                                if (genderRaw.startsWith('M') || genderRaw === 'MASCULINO')
                                    gender = 'M';
                                else if (genderRaw.startsWith('F') || genderRaw === 'FEMININO')
                                    gender = 'F';
                                var regDateRaw = idxCustRegDate > -1 ? row.getCell(idxCustRegDate + 1).value : null;
                                var registrationDate = parseExcelDate(regDateRaw) || undefined;
                                var email = idxCustEmail > -1 ? String(row.getCell(idxCustEmail + 1).value || '').trim() : undefined;
                                var phone = idxCustPhone > -1 ? String(row.getCell(idxCustPhone + 1).value || '').trim() : undefined;
                                if (phone)
                                    phone = phone.replace(/[^0-9]/g, '');
                                customerRecords.push({
                                    name: name_1,
                                    cpf: cpf,
                                    gender: gender,
                                    registrationDate: registrationDate,
                                    email: email,
                                    phone: phone,
                                    originalRow: rowNumber
                                });
                            }
                            else {
                                // DEFAULT SALES/ORDERS LOGIC
                                // Combine Date and Time if they are split
                                var date_1 = null;
                                if (idxDateOnly > -1 && idxTimeOnly > -1) {
                                    var rawDate = row.getCell(idxDateOnly + 1).value;
                                    var rawTime = row.getCell(idxTimeOnly + 1).value;
                                    var parsedD = parseExcelDate(rawDate);
                                    var parsedT = parseExcelDate(rawTime);
                                    if (parsedD && parsedT) {
                                        date_1 = new Date(parsedD.getFullYear(), parsedD.getMonth(), parsedD.getDate(), parsedT.getHours(), parsedT.getMinutes(), parsedT.getSeconds());
                                    }
                                    else {
                                        date_1 = parsedD; // Fallback to just date if time is unparseable
                                    }
                                }
                                else {
                                    var rawData = idxData > -1 ? row.getCell(idxData + 1).value : null;
                                    date_1 = parseExcelDate(rawData);
                                }
                                // Value Parsing
                                var valor_1 = 0;
                                var rawValor = idxValor > -1 ? row.getCell(idxValor + 1).value : null;
                                if (typeof rawValor === 'number') {
                                    valor_1 = rawValor;
                                }
                                else if (typeof rawValor === 'string') {
                                    // Correctly handle Brazilian currency: "1.500,00" -> 1500.00
                                    valor_1 = parseFloat(rawValor.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
                                }
                                if (date_1 && (0, date_fns_1.isValid)(date_1)) {
                                    var rawLoja = idxLoja > -1 ? String(row.getCell(idxLoja + 1).value || '').trim() : defaultStoreName;
                                    var loja = (0, vmpay_config_1.getCanonicalStoreName)(rawLoja);
                                    var cliente = idxCliente > -1 ? String(row.getCell(idxCliente + 1).value || '').trim() : '';
                                    if (isOrdersFile) {
                                        // PARSE ORDER RECORD
                                        var birthDate = undefined;
                                        var age = undefined;
                                        if (idxNascimento > -1) {
                                            var rawBirth = row.getCell(idxNascimento + 1).value;
                                            var parsedBirth = parseExcelDate(rawBirth);
                                            if (parsedBirth && (0, date_fns_1.isValid)(parsedBirth)) {
                                                birthDate = parsedBirth;
                                                // Calculate Age
                                                var today = new Date();
                                                var ageCalc = today.getFullYear() - parsedBirth.getFullYear();
                                                var m = today.getMonth() - parsedBirth.getMonth();
                                                if (m < 0 || (m === 0 && today.getDate() < parsedBirth.getDate())) {
                                                    ageCalc--;
                                                }
                                                if (ageCalc > 0 && ageCalc < 120)
                                                    age = ageCalc;
                                            }
                                        }
                                        orderRecords.push({
                                            data: date_1,
                                            loja: loja || defaultStoreName,
                                            cliente: cliente,
                                            valor: valor_1,
                                            machine: idxMaquina > -1 ? String(row.getCell(idxMaquina + 1).value || '') : '',
                                            service: idxServico > -1 ? String(row.getCell(idxServico + 1).value || '') : '',
                                            status: idxStatus > -1 ? String(row.getCell(idxStatus + 1).value || '') : 'Unknown',
                                            customerId: idxIdCliente > -1 ? String(row.getCell(idxIdCliente + 1).value || '') : undefined,
                                            originalRow: rowNumber,
                                            birthDate: birthDate,
                                            age: age
                                        });
                                    }
                                    else {
                                        // PARSE SALES RECORD
                                        var telefone = idxTelefone > -1 ? String(row.getCell(idxTelefone + 1).value || '').trim() : '';
                                        if (telefone)
                                            telefone = telefone.replace(/[^0-9+\-\s]/g, '');
                                        var produto = idxProduto > -1 ? String(row.getCell(idxProduto + 1).value || '').trim() : '';
                                        var formaPagamento = idxFormaPagamento > -1 ? String(row.getCell(idxFormaPagamento + 1).value || 'Outros') : 'Outros';
                                        // Birth Date Extraction (Sales)
                                        var birthDate = undefined;
                                        var age = undefined;
                                        if (idxNascimento > -1) {
                                            var rawBirth = row.getCell(idxNascimento + 1).value;
                                            var parsedBirth = parseExcelDate(rawBirth);
                                            if (parsedBirth && (0, date_fns_1.isValid)(parsedBirth)) {
                                                birthDate = parsedBirth;
                                                // Calculate Age
                                                var today = new Date();
                                                var ageCalc = today.getFullYear() - parsedBirth.getFullYear();
                                                var m = today.getMonth() - parsedBirth.getMonth();
                                                if (m < 0 || (m === 0 && today.getDate() < parsedBirth.getDate())) {
                                                    ageCalc--;
                                                }
                                                if (ageCalc > 0 && ageCalc < 120)
                                                    age = ageCalc;
                                            }
                                        }
                                        // Composite ID Logic
                                        var id = '';
                                        if (idxId > -1) {
                                            var rawId = String(row.getCell(idxId + 1).value || '').trim();
                                            if (rawId && rawId !== 'null') {
                                                id = "".concat(loja, "-").concat(rawId);
                                            }
                                        }
                                        if (!id) {
                                            // Use row number or content hash to ensure uniqueness if ID is missing
                                            // Using a simple composite of date-client-value
                                            var dateStr = date_1.toISOString();
                                            id = "".concat(loja, "_").concat(dateStr, "_").concat(cliente, "_").concat(valor_1.toFixed(2));
                                        }
                                        // PARSE RAW VMPAY PEDIDO JSON
                                        var parsedItems_1 = [];
                                        var desconto = 0;
                                        if (isRawVMPayExport && idxCupom > -1) {
                                            var cupomStr = String(row.getCell(idxCupom + 1).value || '').trim();
                                            if (cupomStr.includes('valor')) {
                                                try {
                                                    var cupomObj = JSON.parse(cupomStr);
                                                    desconto = cupomObj.valor || 0;
                                                }
                                                catch (e) { }
                                            }
                                        }
                                        if (isRawVMPayExport && idxProduto > -1) {
                                            var rawPedidoObj = row.getCell(idxProduto + 1).value;
                                            if (rawPedidoObj && typeof rawPedidoObj === 'string' && rawPedidoObj.includes('{"itens":[')) {
                                                try {
                                                    var pedidoData = JSON.parse(rawPedidoObj);
                                                    if (pedidoData && pedidoData.itens && Array.isArray(pedidoData.itens)) {
                                                        pedidoData.itens.forEach(function (subItem) {
                                                            if (subItem.maquina || subItem.servico) {
                                                                parsedItems_1.push({
                                                                    machine: subItem.maquina || '',
                                                                    service: subItem.servico || subItem.tipoServico || 'Unknown',
                                                                    status: 'SUCESSO', // assumed for sales export
                                                                    startTime: date_1,
                                                                    value: subItem.valor || valor_1
                                                                });
                                                            }
                                                        });
                                                    }
                                                }
                                                catch (e) {
                                                    // if it's not valid JSON, ignore
                                                }
                                            }
                                        }
                                        // If still no items, but we have a machine (equipamento column), create a dummy item
                                        if (parsedItems_1.length === 0 && idxMaquina > -1) {
                                            var equipamento = String(row.getCell(idxMaquina + 1).value || '').trim();
                                            if (equipamento && equipamento.length > 1) {
                                                parsedItems_1.push({
                                                    machine: equipamento,
                                                    service: produto || 'Unknown',
                                                    status: 'SUCESSO',
                                                    startTime: date_1,
                                                    value: valor_1
                                                });
                                            }
                                        }
                                        salesRecords.push({
                                            id: id,
                                            data: date_1,
                                            loja: loja || defaultStoreName,
                                            cliente: cliente,
                                            customerId: idxIdCliente > -1 ? String(row.getCell(idxIdCliente + 1).value || '') : undefined,
                                            telefone: telefone,
                                            originalRow: rowNumber,
                                            produto: isRawVMPayExport ? (parsedItems_1.length > 0 ? parsedItems_1[0].service : 'RAW_EXPORT') : produto,
                                            valor: valor_1,
                                            formaPagamento: formaPagamento,
                                            tipoCartao: idxTipoCartao > -1 ? String(row.getCell(idxTipoCartao + 1).value || '') : '',
                                            categoriaVoucher: idxCategoriaVoucher > -1 ? String(row.getCell(idxCategoriaVoucher + 1).value || '') : '',
                                            desconto: desconto,
                                            items: parsedItems_1,
                                            birthDate: birthDate,
                                            age: age
                                        });
                                    }
                                }
                            }
                        }
                        catch (e) {
                            // Silent fail
                        }
                    });
                    logs.push("[ETL] Parsing Complete. Generated ".concat(isOrdersFile ? orderRecords.length : (isCustomersFile ? customerRecords.length : salesRecords.length), " records."));
                    if (isCustomersFile) {
                        return [2 /*return*/, {
                                type: 'customers',
                                records: [], // Empty sales records
                                customers: customerRecords,
                                errors: errors,
                                logs: logs,
                                summary: { totalSales: 0, totalValue: 0, startDate: null, endDate: null }
                            }];
                    }
                    else if (isOrdersFile) {
                        return [2 /*return*/, {
                                type: 'orders',
                                records: orderRecords,
                                errors: errors,
                                logs: logs
                            }];
                    }
                    else {
                        if (salesRecords.length === 0 && errors.length === 0) {
                            errors.push("Nenhum registro encontrado. Header na linha ".concat(headerRowIndex, "."));
                        }
                        return [2 /*return*/, calculateSummary(salesRecords, errors, logs)];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function parseCSV(buffer, defaultStoreName) {
    return __awaiter(this, void 0, void 0, function () {
        var text, errors, logs;
        return __generator(this, function (_a) {
            text = new TextDecoder('utf-8').decode(buffer);
            errors = [];
            logs = [];
            logs.push("[ETL] Started parsing CSV file. Default Store: ".concat(defaultStoreName));
            return [2 /*return*/, new Promise(function (resolve) {
                    papaparse_1.default.parse(text, {
                        header: false,
                        skipEmptyLines: true,
                        complete: function (results) {
                            var rows = results.data;
                            if (!rows || rows.length === 0) {
                                return resolve({ type: 'sales', records: [], errors: ["CSV vazio"], logs: logs, summary: { totalSales: 0, totalValue: 0, startDate: null, endDate: null } });
                            }
                            // --- HEADER DETECTION ---
                            var headerRowIndex = -1;
                            var isOrdersFile = false;
                            var isCustomersFile = false;
                            var isRawVMPayExport = false;
                            var idxId = -1, idxData = -1, idxValor = -1, idxLoja = -1, idxCliente = -1, idxProduto = -1;
                            var idxFormaPagamento = -1, idxTipoCartao = -1, idxCategoriaVoucher = -1, idxDesconto = -1;
                            var idxTelefone = -1, idxNascimento = -1, idxIdCliente = -1, idxMaquina = -1, idxServico = -1, idxStatus = -1;
                            var idxDateOnly = -1, idxTimeOnly = -1, idxCupom = -1;
                            var idxCustName = -1, idxCustGender = -1, idxCustRegDate = -1, idxCustCpf = -1, idxCustEmail = -1, idxCustPhone = -1;
                            // Scan first 50 rows for headers
                            for (var r = 0; r < Math.min(rows.length, 50); r++) {
                                var headers = rows[r].map(function (h) { return String(h || ''); });
                                var iData = findColumnIndex(headers, 'data');
                                var iHora = headers.findIndex(function (h) { return normalizeHeader(h) === 'hora'; });
                                var iValor = findColumnIndex(headers, 'valor');
                                var iCustGender = findColumnIndex(headers, 'customerGender');
                                var iCustRegDate = findColumnIndex(headers, 'customerRegDate');
                                if (iCustGender > -1 && iCustRegDate > -1) {
                                    headerRowIndex = r;
                                    isCustomersFile = true;
                                    idxCustName = findColumnIndex(headers, 'customerName');
                                    idxCustGender = iCustGender;
                                    idxCustRegDate = iCustRegDate;
                                    idxCustCpf = findColumnIndex(headers, 'customerCpf');
                                    idxCustEmail = findColumnIndex(headers, 'customerEmail');
                                    idxCustPhone = findColumnIndex(headers, 'customerPhone');
                                    logs.push("[ETL CSV] Header Found at Row ".concat(r, ". Type: CUSTOMERS"));
                                    break;
                                }
                                if (iData > -1) {
                                    var iMaquina = findColumnIndex(headers, 'maquina');
                                    var iServico = findColumnIndex(headers, 'servico');
                                    if (iMaquina > -1 && iServico > -1) {
                                        isOrdersFile = true;
                                        headerRowIndex = r;
                                        idxMaquina = iMaquina;
                                        idxServico = iServico;
                                        idxStatus = findColumnIndex(headers, 'status');
                                        idxNascimento = findColumnIndex(headers, 'nascimento');
                                        if (idxNascimento === -1) {
                                            idxNascimento = headers.findIndex(function (h) {
                                                var norm = normalizeHeader(h);
                                                return norm.includes('nasc') || norm.includes('aniversario');
                                            });
                                        }
                                        idxData = iData;
                                        idxValor = iValor;
                                        idxLoja = findColumnIndex(headers, 'loja');
                                        idxCliente = findColumnIndex(headers, 'cliente');
                                        idxIdCliente = findColumnIndex(headers, 'id_cliente');
                                    }
                                    else if (iValor > -1) {
                                        var isRaw = headers.some(function (h) { return normalizeHeader(h) === 'creditoreal' || normalizeHeader(h) === 'idvenda' || normalizeHeader(h) === 'autorizador'; });
                                        if (isRaw)
                                            isRawVMPayExport = true;
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
                                            idxNascimento = headers.findIndex(function (h) {
                                                var norm = normalizeHeader(h);
                                                return norm.includes('nasc') || norm.includes('aniversario');
                                            });
                                        }
                                    }
                                    if (headerRowIndex > -1) {
                                        if (iData > -1 && iHora > -1) {
                                            idxDateOnly = iData;
                                            idxTimeOnly = iHora;
                                        }
                                        logs.push("[ETL CSV] Header Found at Row ".concat(r, ". Type: ").concat(isOrdersFile ? 'ORDERS' : (isRawVMPayExport ? 'RAW_VMPAY' : 'SALES')));
                                        break;
                                    }
                                }
                            }
                            if (headerRowIndex === -1) {
                                errors.push("Cabeçalho não identificado.");
                                logs.push("[ETL CSV] Falha: Cabeçalho não encontrado.");
                                return resolve({ type: 'sales', records: [], errors: errors, logs: logs, summary: { totalSales: 0, totalValue: 0, startDate: null, endDate: null } });
                            }
                            var salesRecords = [];
                            var orderRecords = [];
                            var customerRecords = [];
                            var _loop_2 = function (r) {
                                var row = rows[r];
                                if (!row || row.length === 0)
                                    return "continue";
                                try {
                                    if (isCustomersFile) {
                                        // ... simple mapping
                                        var name_2 = idxCustName > -1 ? String(row[idxCustName] || '').trim() : '';
                                        if (!name_2 || name_2.length < 2)
                                            return "continue";
                                        var cpfRaw = idxCustCpf > -1 ? String(row[idxCustCpf] || '').trim() : '';
                                        var cpf = cpfRaw.replace(/[^0-9]/g, '');
                                        var genderRaw = idxCustGender > -1 ? String(row[idxCustGender] || '').trim().toUpperCase() : '';
                                        var gender = 'U';
                                        if (genderRaw.startsWith('M') || genderRaw === 'MASCULINO')
                                            gender = 'M';
                                        else if (genderRaw.startsWith('F') || genderRaw === 'FEMININO')
                                            gender = 'F';
                                        var regDateRaw = idxCustRegDate > -1 ? row[idxCustRegDate] : null;
                                        var registrationDate = parseExcelDate(regDateRaw) || undefined;
                                        var email = idxCustEmail > -1 ? String(row[idxCustEmail] || '').trim() : undefined;
                                        var phone = idxCustPhone > -1 ? String(row[idxCustPhone] || '').trim() : undefined;
                                        if (phone)
                                            phone = phone.replace(/[^0-9]/g, '');
                                        customerRecords.push({ name: name_2, cpf: cpf, gender: gender, registrationDate: registrationDate, email: email, phone: phone, originalRow: r });
                                    }
                                    else {
                                        var date_2 = null;
                                        if (idxDateOnly > -1 && idxTimeOnly > -1) {
                                            var parsedD = parseExcelDate(row[idxDateOnly]);
                                            var parsedT = parseExcelDate(row[idxTimeOnly]);
                                            if (parsedD && parsedT) {
                                                date_2 = new Date(parsedD.getFullYear(), parsedD.getMonth(), parsedD.getDate(), parsedT.getHours(), parsedT.getMinutes(), parsedT.getSeconds());
                                            }
                                            else {
                                                date_2 = parsedD;
                                            }
                                        }
                                        else {
                                            date_2 = parseExcelDate(idxData > -1 ? row[idxData] : null);
                                        }
                                        var valor_2 = 0;
                                        var rawValor = idxValor > -1 ? row[idxValor] : null;
                                        if (typeof rawValor === 'string') {
                                            // Correctly handle Brazilian currency: "1.500,00" -> 1500.00
                                            valor_2 = parseFloat(rawValor.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
                                        }
                                        else if (typeof rawValor === 'number') {
                                            valor_2 = rawValor;
                                        }
                                        if (date_2 && (0, date_fns_1.isValid)(date_2)) {
                                            var loja = idxLoja > -1 ? String(row[idxLoja] || '').trim() : defaultStoreName;
                                            var cliente = idxCliente > -1 ? String(row[idxCliente] || '').trim() : '';
                                            if (isOrdersFile) {
                                                var birthDate = undefined;
                                                var age = undefined;
                                                if (idxNascimento > -1) {
                                                    var parsedBirth = parseExcelDate(row[idxNascimento]);
                                                    if (parsedBirth && (0, date_fns_1.isValid)(parsedBirth)) {
                                                        birthDate = parsedBirth;
                                                        var today = new Date();
                                                        var ageCalc = today.getFullYear() - parsedBirth.getFullYear();
                                                        if (today.getMonth() < parsedBirth.getMonth() || (today.getMonth() === parsedBirth.getMonth() && today.getDate() < parsedBirth.getDate()))
                                                            ageCalc--;
                                                        if (ageCalc > 0 && ageCalc < 120)
                                                            age = ageCalc;
                                                    }
                                                }
                                                orderRecords.push({
                                                    data: date_2,
                                                    loja: loja || defaultStoreName,
                                                    cliente: cliente,
                                                    valor: valor_2,
                                                    machine: idxMaquina > -1 ? String(row[idxMaquina] || '') : '',
                                                    service: idxServico > -1 ? String(row[idxServico] || '') : '',
                                                    status: idxStatus > -1 ? String(row[idxStatus] || '') : 'Unknown',
                                                    customerId: idxIdCliente > -1 ? String(row[idxIdCliente] || '') : undefined,
                                                    originalRow: r,
                                                    birthDate: birthDate,
                                                    age: age
                                                });
                                            }
                                            else {
                                                var telefone = idxTelefone > -1 ? String(row[idxTelefone] || '').trim() : '';
                                                if (telefone)
                                                    telefone = telefone.replace(/[^0-9+\-\s]/g, '');
                                                var produto = idxProduto > -1 ? String(row[idxProduto] || '').trim() : '';
                                                var formaPagamento = idxFormaPagamento > -1 ? String(row[idxFormaPagamento] || 'Outros') : 'Outros';
                                                var birthDate = undefined;
                                                var age = undefined;
                                                if (idxNascimento > -1) {
                                                    var parsedBirth = parseExcelDate(row[idxNascimento]);
                                                    if (parsedBirth && (0, date_fns_1.isValid)(parsedBirth)) {
                                                        birthDate = parsedBirth;
                                                        var today = new Date();
                                                        var ageCalc = today.getFullYear() - parsedBirth.getFullYear();
                                                        if (today.getMonth() < parsedBirth.getMonth() || (today.getMonth() === parsedBirth.getMonth() && today.getDate() < parsedBirth.getDate()))
                                                            ageCalc--;
                                                        if (ageCalc > 0 && ageCalc < 120)
                                                            age = ageCalc;
                                                    }
                                                }
                                                var id = idxId > -1 ? String(row[idxId] || '').trim() : '';
                                                if (id && id !== 'null')
                                                    id = "".concat(loja, "-").concat(id);
                                                if (!id)
                                                    id = "".concat(loja, "_").concat(date_2.toISOString(), "_").concat(cliente, "_").concat(valor_2.toFixed(2));
                                                var parsedItems_2 = [];
                                                var desconto = 0;
                                                if (isRawVMPayExport && idxCupom > -1) {
                                                    var cupomStr = String(row[idxCupom] || '').trim();
                                                    if (cupomStr.includes('valor')) {
                                                        try {
                                                            desconto = JSON.parse(cupomStr).valor || 0;
                                                        }
                                                        catch (e) { }
                                                    }
                                                }
                                                if (isRawVMPayExport && idxProduto > -1) {
                                                    var rawPedidoObj = String(row[idxProduto] || '');
                                                    if (rawPedidoObj.includes('{"itens":[')) {
                                                        try {
                                                            var pedidoData = JSON.parse(rawPedidoObj);
                                                            if (pedidoData && pedidoData.itens && Array.isArray(pedidoData.itens)) {
                                                                pedidoData.itens.forEach(function (subItem) {
                                                                    if (subItem.maquina || subItem.servico) {
                                                                        parsedItems_2.push({ machine: subItem.maquina || '', service: subItem.servico || subItem.tipoServico || 'Unknown', status: 'SUCESSO', startTime: date_2, value: subItem.valor || valor_2 });
                                                                    }
                                                                });
                                                            }
                                                        }
                                                        catch (e) { }
                                                    }
                                                }
                                                if (parsedItems_2.length === 0 && idxMaquina > -1) {
                                                    var equipamento = String(row[idxMaquina] || '').trim();
                                                    if (equipamento.length > 1)
                                                        parsedItems_2.push({ machine: equipamento, service: produto || 'Unknown', status: 'SUCESSO', startTime: date_2, value: valor_2 });
                                                }
                                                salesRecords.push({
                                                    id: id,
                                                    data: date_2, loja: loja || defaultStoreName,
                                                    cliente: cliente,
                                                    customerId: idxIdCliente > -1 ? String(row[idxIdCliente] || '') : undefined,
                                                    telefone: telefone,
                                                    originalRow: r,
                                                    produto: isRawVMPayExport ? (parsedItems_2.length > 0 ? parsedItems_2[0].service : 'RAW_EXPORT') : produto,
                                                    valor: valor_2,
                                                    formaPagamento: formaPagamento,
                                                    tipoCartao: idxTipoCartao > -1 ? String(row[idxTipoCartao] || '') : '',
                                                    categoriaVoucher: idxCategoriaVoucher > -1 ? String(row[idxCategoriaVoucher] || '') : '',
                                                    desconto: desconto,
                                                    items: parsedItems_2,
                                                    birthDate: birthDate,
                                                    age: age
                                                });
                                            }
                                        }
                                    }
                                }
                                catch (e) { }
                            };
                            for (var r = headerRowIndex + 1; r < rows.length; r++) {
                                _loop_2(r);
                            }
                            logs.push("[ETL CSV] Parsing Complete. Generated ".concat(isOrdersFile ? orderRecords.length : (isCustomersFile ? customerRecords.length : salesRecords.length), " records."));
                            if (isCustomersFile) {
                                resolve({ type: 'customers', records: [], customers: customerRecords, errors: errors, logs: logs, summary: { totalSales: 0, totalValue: 0, startDate: null, endDate: null } });
                            }
                            else if (isOrdersFile) {
                                resolve({ type: 'orders', records: orderRecords, errors: errors, logs: logs });
                            }
                            else {
                                if (salesRecords.length === 0 && errors.length === 0)
                                    errors.push("Nenhum registro encontrado. Header na linha ".concat(headerRowIndex, "."));
                                resolve(calculateSummary(salesRecords, errors, logs));
                            }
                        }
                    });
                })];
        });
    });
}
function calculateSummary(records, errors, logs) {
    var totalSales = records.length;
    var totalValue = records.reduce(function (acc, r) { return acc + r.valor; }, 0);
    var sorted = __spreadArray([], records, true).sort(function (a, b) { return a.data.getTime() - b.data.getTime(); });
    return {
        type: 'sales',
        records: records,
        errors: errors,
        logs: logs,
        summary: {
            totalSales: totalSales,
            totalValue: totalValue,
            startDate: sorted.length > 0 ? sorted[0].data : null,
            endDate: sorted.length > 0 ? sorted[sorted.length - 1].data : null
        }
    };
}
