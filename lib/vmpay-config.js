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
exports.STATIC_VMPAY_CREDENTIALS = exports.STORE_NAME_MAP = exports.VMPAY_API_BASE_URL = void 0;
exports.getCanonicalStoreName = getCanonicalStoreName;
exports.getVMPayMasterAccount = getVMPayMasterAccount;
exports.getVMPayCredentials = getVMPayCredentials;
var supabase_1 = require("./supabase");
exports.VMPAY_API_BASE_URL = process.env.NEXT_PUBLIC_VMPAY_API_BASE_URL || "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";
// Store Name Normalization Map
// Maps raw names from API/Spreadsheets to Canonical Names used in UI
exports.STORE_NAME_MAP = {
    "LAVATERIA BEZERRA MENEZES": "Lavateria Cascavel",
    "BEZERRA MENEZES": "Lavateria Cascavel",
    "BEZERRA": "Lavateria Cascavel",
    "CASCAVEL": "Lavateria Cascavel",
    "LAVATERIA SANTOS DUMONT": "Lavateria SANTOS DUMONT",
    "SANTOS DUMONT": "Lavateria SANTOS DUMONT",
    "LAVATERIA JOSE WALTER": "Lavateria JOSE WALTER",
    "JOSE WALTER": "Lavateria JOSE WALTER",
    "LAVATERIA SHOPPING (MARACANAU)": "Lavateria SHOPPING (Maracanau)",
    "MARACANAU": "Lavateria SHOPPING (Maracanau)",
    "LAVATERIA SHOPPING SOLARES": "Lavateria SHOPPING SOLARES",
    "SOLARES": "Lavateria SHOPPING SOLARES",
    "LAVATERIA JOQUEI": "Lavateria JOQUEI",
    "JOQUEI": "Lavateria JOQUEI"
};
// Cache to avoid slow string normalization loops on the main thread
var nameCache = new Map();
/**
 * Normalizes a store name to its canonical version.
 */
function getCanonicalStoreName(rawName) {
    if (!rawName)
        return "Desconhecido";
    // Fast path: return if we've already resolved this string
    if (nameCache.has(rawName))
        return nameCache.get(rawName);
    // Normalize string: Remove accents and convert to uppercase
    var normalize = function (s) {
        return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    };
    var normalizedRaw = normalize(rawName);
    // 1. Check direct mapping (with normalization)
    for (var _i = 0, _a = Object.entries(exports.STORE_NAME_MAP); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], val = _b[1];
        if (normalize(key) === normalizedRaw) {
            nameCache.set(rawName, val);
            return val;
        }
    }
    // 2. Check partial matches (Greedy - find the most specific key)
    var sortedKeys = Object.keys(exports.STORE_NAME_MAP).sort(function (a, b) { return b.length - a.length; });
    for (var _c = 0, sortedKeys_1 = sortedKeys; _c < sortedKeys_1.length; _c++) {
        var key = sortedKeys_1[_c];
        var normalizedKey = normalize(key);
        if (normalizedRaw.includes(normalizedKey) || normalizedKey.includes(normalizedRaw)) {
            nameCache.set(rawName, exports.STORE_NAME_MAP[key]);
            return exports.STORE_NAME_MAP[key];
        }
    }
    nameCache.set(rawName, rawName);
    return rawName;
}
// Static fallback for initial setup or development
exports.STATIC_VMPAY_CREDENTIALS = [
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
function getVMPayMasterAccount(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error, e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('profiles')
                            .select('vmpay_user, vmpay_password')
                            .eq('id', userId)
                            .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    if (data && data.vmpay_user) {
                        return [2 /*return*/, {
                                user: data.vmpay_user,
                                pass: data.vmpay_password || ''
                            }];
                    }
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _b.sent();
                    console.error("[VMPay Config] Failed to fetch master account:", e_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/, null];
            }
        });
    });
}
/**
 * Fetches all active store credentials from the database.
 * Falls back to static credentials if the database is not configured or empty.
 */
function getVMPayCredentials() {
    return __awaiter(this, void 0, void 0, function () {
        var withTimeout, _a, data, error, e_2;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    withTimeout = function (promise, timeoutMs) { return __awaiter(_this, void 0, void 0, function () {
                        var timeoutId, timeoutPromise;
                        return __generator(this, function (_a) {
                            timeoutPromise = new Promise(function (_, reject) {
                                timeoutId = setTimeout(function () { return reject(new Error("Timeout")); }, timeoutMs);
                            });
                            return [2 /*return*/, Promise.race([promise, timeoutPromise]).finally(function () { return clearTimeout(timeoutId); })];
                        });
                    }); };
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    console.log("[VMPay Config] Fetching stores with 15s timeout...");
                    return [4 /*yield*/, withTimeout(supabase_1.supabase
                            .from('stores')
                            .select("\n                    id, name, cnpj, api_key, open_time, close_time, \n                    is_active, has_ac_subscription, tuya_device_id,\n                    tuya_client_id, tuya_client_secret, tuya_scene_on_id,\n                    tuya_scene_off_id, cep, address, number,\n                    complement, neighborhood, city, state\n                ")
                            .eq('is_active', true), 15000)];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    if (data && data.length > 0) {
                        return [2 /*return*/, data.map(function (d) { return ({
                                id: d.id,
                                name: getCanonicalStoreName(d.name),
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
                                tuyaSceneOffId: d.tuya_scene_off_id,
                                cep: d.cep,
                                address: d.address,
                                number: d.number,
                                complement: d.complement,
                                neighborhood: d.neighborhood,
                                city: d.city,
                                state: d.state
                            }); })];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _b.sent();
                    console.warn("[VMPay Config] Fallback to STATIC due to: ".concat(e_2.message));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, exports.STATIC_VMPAY_CREDENTIALS];
            }
        });
    });
}
