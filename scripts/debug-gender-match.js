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
Object.defineProperty(exports, "__esModule", { value: true });
var crm_1 = require("../lib/processing/crm");
var supabase_js_1 = require("@supabase/supabase-js");
var supabase = (0, supabase_js_1.createClient)("https://ftbhivcltxoakwjuvqax.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YmhpdmNsdHhvYWt3anV2cWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDU5MTksImV4cCI6MjA4NzUyMTkxOX0.S_FdBD4TmkcZSnzF-inzZCKCxezn5WUHM4FXnNa3jrY");
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var allCustomers, page, data, sales, mappedSales, mappedCustomers, cStats, metrics, genderStats;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Fetching ALL customers...");
                    allCustomers = [];
                    page = 0;
                    _a.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 3];
                    return [4 /*yield*/, supabase.from('customers').select('*').range(page * 5000, (page + 1) * 5000 - 1)];
                case 2:
                    data = (_a.sent()).data;
                    if (!data || data.length === 0)
                        return [3 /*break*/, 3];
                    allCustomers.push.apply(allCustomers, data);
                    page++;
                    return [3 /*break*/, 1];
                case 3:
                    console.log("Fetching latest sales...");
                    return [4 /*yield*/, supabase.from('sales').select('*').order('data', { ascending: false }).limit(10000)];
                case 4:
                    sales = (_a.sent()).data;
                    console.log("Loaded ".concat(allCustomers.length, " customers and ").concat(sales === null || sales === void 0 ? void 0 : sales.length, " sales."));
                    mappedSales = (sales || []).map(function (s) { return ({
                        id: s.id,
                        data: new Date(s.data),
                        loja: s.loja,
                        cliente: s.cliente,
                        produto: s.produto,
                        valor: Number(s.valor),
                        formaPagamento: s.forma_pagamento,
                        tipoCartao: s.tipo_cartao,
                        categoriaVoucher: s.categoria_voucher,
                        desconto: Number(s.desconto),
                        telefone: s.telefone,
                        customerId: s.customer_id,
                        originalRow: 0
                    }); });
                    mappedCustomers = allCustomers.map(function (c) { return ({
                        id: c.id,
                        cpf: c.cpf || '',
                        name: c.name || '',
                        phone: c.phone || '',
                        email: c.email || '',
                        gender: c.gender || 'U',
                        registrationDate: c.registration_date ? new Date(c.registration_date) : undefined,
                        originalRow: 0
                    }); });
                    console.log("Sample mappedCustomers gender spread:");
                    cStats = { M: 0, F: 0, U: 0 };
                    mappedCustomers.forEach(function (c) { return cStats[c.gender || 'U']++; });
                    console.log(cStats);
                    metrics = (0, crm_1.calculateCrmMetrics)(mappedSales, mappedCustomers);
                    genderStats = { M: 0, F: 0, U: 0 };
                    metrics.profiles.forEach(function (p) {
                        genderStats[p.gender || 'U']++;
                    });
                    console.log("CRM Result Gender Spread:", genderStats);
                    return [2 /*return*/];
            }
        });
    });
}
run().catch(console.error);
