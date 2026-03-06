"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCrmMetrics = calculateCrmMetrics;
exports.calculatePeriodStats = calculatePeriodStats;
exports.calculateOccupancyHeatmap = calculateOccupancyHeatmap;
exports.calculateVisitsHeatmap = calculateVisitsHeatmap;
exports.getCycleDuration = getCycleDuration;
exports.getProfile = getProfile;
exports.calculateVisitCount = calculateVisitCount;
var date_fns_1 = require("date-fns");
var DAYS_MAP = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
function detectCycleType(service, machine, store) {
    var svc = (service || '').toLowerCase();
    var mac = (machine || '').toLowerCase();
    var sto = (store || '').toUpperCase();
    var isLavateria = sto.includes('LAVATERIA');
    var machineNumMatch = mac.match(/\d+/);
    var machineNum = machineNumMatch ? parseInt(machineNumMatch[0], 10) : NaN;
    if (isLavateria && !isNaN(machineNum)) {
        // Regra Lavateria: Par = Lavagem, Ímpar = Secagem
        return { isWash: machineNum % 2 === 0, isDry: machineNum % 2 !== 0 };
    }
    // Regras Gerais
    var isWash = svc.includes('lav') || mac.includes('lav') || /^l\d/i.test(mac) || /30\s*min/i.test(svc) || /35\s*min/i.test(svc);
    var isDry = svc.includes('sec') || mac.includes('sec') || /^s\d/i.test(mac) || /45\s*min/i.test(svc) || /15\s*min/i.test(svc);
    return { isWash: isWash, isDry: isDry };
}
function calculateCrmMetrics(records, customerRegistry, allOrders) {
    var _a, _b, _c, _d, _e, _f;
    var profilerLabel = "calculateCrmMetrics(".concat(records.length, ")");
    console.time(profilerLabel);
    var customers = {};
    var washCount = 0;
    var dryCount = 0;
    var totalCycles = 0;
    var profiles = [];
    // Build Registry Maps
    var registryMap = new Map();
    var registryMapById = new Map();
    if (customerRegistry) {
        for (var i = 0; i < customerRegistry.length; i++) {
            var c = customerRegistry[i];
            if (c.id)
                registryMapById.set(String(c.id), c);
            if (c.name && c.name.length > 2) {
                registryMap.set(c.name.trim().toUpperCase(), c);
            }
        }
    }
    // Pre-calculate O(1) Order Map to prevent O(N^2) browser freeze loop
    var ordersBySaleId = new Map();
    if (allOrders && allOrders.length > 0) {
        for (var i = 0; i < allOrders.length; i++) {
            var order = allOrders[i];
            if (order.sale_id) {
                var existing = ordersBySaleId.get(String(order.sale_id)) || [];
                existing.push(order);
                ordersBySaleId.set(String(order.sale_id), existing);
            }
        }
    }
    // 1. Single Pass for Min/Max date, possible prices, and grouping
    var latestTimestamp = 0;
    records.forEach(function (r) {
        var ts = r.data.getTime();
        if (ts > latestTimestamp)
            latestTimestamp = ts;
    });
    var today = latestTimestamp > 0 ? new Date(latestTimestamp) : new Date();
    var todayTs = today.getTime();
    var globalMinCyclePrice = 18.0;
    var storeCyclePrices = {};
    var possibleCyclePrices = [];
    var phoneMap = {};
    for (var i = 0; i < records.length; i++) {
        var r = records[i];
        // Price detection logic
        if (r.valor >= 8.0 && r.valor <= 25.0) {
            possibleCyclePrices.push(r.valor);
            var store = (r.loja || 'DEFAULT').toUpperCase();
            if (!storeCyclePrices[store] || r.valor < storeCyclePrices[store]) {
                storeCyclePrices[store] = r.valor;
            }
        }
        // Grouping logic
        if (!r.cliente)
            continue;
        var name_1 = r.cliente.trim().toUpperCase();
        if (name_1 === "CONSUMIDOR FINAL" || name_1 === "PEDIDO BALCÃO")
            continue;
        if (name_1.includes("ADMIN") || name_1.includes("TESTE"))
            continue;
        if (r.telefone && r.telefone.length > 5) {
            phoneMap[name_1] = r.telefone;
        }
        if (!customers[name_1])
            customers[name_1] = [];
        customers[name_1].push(r);
    }
    if (possibleCyclePrices.length > 0) {
        possibleCyclePrices.sort(function (a, b) { return a - b; });
        var p10Index = Math.floor(possibleCyclePrices.length * 0.1);
        globalMinCyclePrice = possibleCyclePrices[p10Index] || 18.0;
    }
    var customerEntries = Object.entries(customers);
    var _loop_1 = function (i) {
        var _g = customerEntries[i], name_2 = _g[0], sales = _g[1];
        // ... (sorting)
        // Calculate Visits & Last 5 Visits Details
        // Sort sales by date ascending for grouping logic
        sales.sort(function (a, b) { return a.data.getTime() - b.data.getTime(); });
        // New Grouping Logic: 180-minute window = 1 Visit
        var visitsList = [];
        var profileWashCount = 0;
        var profileDryCount = 0;
        var uniqueSales = new Set();
        var salesCount = sales.length;
        var _loop_2 = function (k) {
            var r = sales[k];
            // --- EMERGENCY DEDUPLICATION ---
            // Protect against ghost IndexedDB arrays multiplying the metrics
            // Using ID and product name is enough mathematically because VMPay forbids selecting the same product twice.
            var safeKey = "".concat(r.id || 'noid', "-").concat(r.produto || 'noprod');
            if (uniqueSales.has(safeKey))
                return "continue";
            uniqueSales.add(safeKey);
            // Count Cycles per Sale Item (Independent of Visit grouping for totals)
            var wDetails = 0;
            var dDetails = 0;
            var saleOrders = r.id ? (ordersBySaleId.get(String(r.id)) || []) : [];
            if (saleOrders.length > 0) {
                // Precision: Count exact baskets from the orders table
                saleOrders.forEach(function (o) {
                    var _a = detectCycleType(o.service, o.machine, r.loja), isWash = _a.isWash, isDry = _a.isDry;
                    if (isWash)
                        wDetails++;
                    if (isDry)
                        dDetails++;
                });
            }
            else if (r.items && r.items.length > 0) {
                // Fallback: Use nested items if provided (rare in Cloud DB, common in manual upload)
                r.items.forEach(function (item) {
                    var _a = detectCycleType(item.service, item.machine, r.loja), isWash = _a.isWash, isDry = _a.isDry;
                    if (isWash)
                        wDetails++;
                    if (isDry)
                        dDetails++;
                });
            }
            else {
                // Heuristic Fallback (Only plays if neither is available)
                var _h = detectCycleType(r.produto, '', r.loja), isWash = _h.isWash, isDry = _h.isDry;
                if (isWash)
                    wDetails++;
                if (isDry)
                    dDetails++;
                var store = (r.loja || 'DEFAULT').toUpperCase();
                // Heuristic: Determine the base price for this transaction
                var basePrice = storeCyclePrices[store] || globalMinCyclePrice || 18.0;
                // If neither wash nor dry was explicitly found in the name, but value is high, we can infer some distribution.
                var impliedCount = Math.round(r.valor / basePrice);
                if (impliedCount > 0 && wDetails === 0 && dDetails === 0) {
                    // If we have no clue, assume 50/50 split or just default to washing if odd
                    wDetails = Math.ceil(impliedCount / 2);
                    dDetails = Math.floor(impliedCount / 2);
                }
                else if ((wDetails > 0 || dDetails > 0) && r.valor > basePrice * 1.5) {
                    if (impliedCount > 1) {
                        if (wDetails > 0 && dDetails === 0)
                            wDetails = impliedCount;
                        else if (dDetails > 0 && wDetails === 0)
                            dDetails = impliedCount;
                    }
                }
            }
            profileWashCount += wDetails;
            profileDryCount += dDetails;
            // Visit Grouping Logic
            var lastVisit = visitsList.length > 0 ? visitsList[visitsList.length - 1] : null; // Get last added visit
            // Check if current sale fits in the 180-minute window of the last visit
            // Window starts at `lastVisit.date` (which is the first sale time of that visit)
            if (lastVisit && (0, date_fns_1.differenceInMinutes)(r.data, lastVisit.date) <= 180 && (0, date_fns_1.differenceInMinutes)(r.data, lastVisit.date) >= 0) {
                lastVisit.items.push(r);
                lastVisit.totalValue += r.valor;
                lastVisit.washCount += wDetails;
                lastVisit.dryCount += dDetails;
            }
            else {
                // New Visit Start
                visitsList.push({
                    date: r.data,
                    items: [r],
                    totalValue: r.valor,
                    washCount: wDetails,
                    dryCount: dDetails
                });
            }
        };
        for (var k = 0; k < salesCount; k++) {
            _loop_2(k);
        }
        var profileTotalCycles = profileWashCount + profileDryCount;
        totalCycles += profileTotalCycles;
        washCount += profileWashCount;
        dryCount += profileDryCount;
        // Calculate Aggregates based on Visits List
        var totalVisits = visitsList.length;
        var totalSpent = sales.reduce(function (acc, curr) { return acc + curr.valor; }, 0);
        var averageTicket = totalVisits > 0 ? totalSpent / totalVisits : 0;
        var totalBaskets_1 = profileTotalCycles; // Alinhado com a definição global: 1 ciclo = 1 cesta
        var avgBasketsPerVisit = totalVisits > 0 ? totalBaskets_1 / totalVisits : 0;
        // Dates
        // sales is sorted asc, so last is end
        var lastVisitDate = sales[sales.length - 1].data;
        var firstVisitDate = sales[0].data;
        var recency = (0, date_fns_1.differenceInDays)(today, lastVisitDate);
        // ... existing period/pref calculations ... 
        // We need to keep lines 196-243 from original code or rewrite them.
        // Let's rewrite them briefly to ensure context is maintained since we are replacing a big chunk.
        // Period Spending (kept same)
        var spent30d = 0;
        var spent90d = 0;
        var spent180d = 0;
        var baskets180d = 0;
        var d30Ts = todayTs - 30 * 24 * 60 * 60 * 1000;
        var d90Ts = todayTs - 90 * 24 * 60 * 60 * 1000;
        var d180Ts = todayTs - 180 * 24 * 60 * 60 * 1000;
        for (var j = 0; j < sales.length; j++) {
            var s = sales[j];
            var sTs = s.data.getTime();
            if (sTs > d30Ts)
                spent30d += s.valor;
            if (sTs > d90Ts)
                spent90d += s.valor;
            if (sTs > d180Ts) {
                spent180d += s.valor;
                baskets180d++;
            }
        }
        // Preferences (kept same)
        var dayCounts = {};
        var shiftCounts = {};
        var slotCounts = {};
        var storeCounts = {};
        // Use visitsList for preferences? Or raw sales? Usually raw sales for "When do they buy".
        sales.forEach(function (s) {
            var dayName = DAYS_MAP[(0, date_fns_1.getDay)(s.data)];
            var hour = (0, date_fns_1.getHours)(s.data);
            var shift = 'Madrugada';
            if (hour >= 6 && hour < 12)
                shift = 'Manhã';
            else if (hour >= 12 && hour < 18)
                shift = 'Tarde';
            else if (hour >= 18)
                shift = 'Noite';
            dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
            shiftCounts[shift] = (shiftCounts[shift] || 0) + 1;
            var slotKey = "".concat(dayName, " - ").concat(shift);
            slotCounts[slotKey] = (slotCounts[slotKey] || 0) + 1;
            if (s.loja) {
                storeCounts[s.loja] = (storeCounts[s.loja] || 0) + 1;
            }
        });
        var preferredStore = (_a = Object.entries(storeCounts).sort(function (a, b) { return b[1] - a[1]; })[0]) === null || _a === void 0 ? void 0 : _a[0];
        var topDay = ((_b = Object.entries(dayCounts).sort(function (a, b) { return b[1] - a[1]; })[0]) === null || _b === void 0 ? void 0 : _b[0]) || 'N/A';
        var topShift = ((_c = Object.entries(shiftCounts).sort(function (a, b) { return b[1] - a[1]; })[0]) === null || _c === void 0 ? void 0 : _c[0]) || 'N/A';
        var topSlots = Object.entries(slotCounts)
            .sort(function (a, b) { return b[1] - a[1]; })
            .slice(0, 3)
            .map(function (_a) {
            var key = _a[0], count = _a[1];
            var _b = key.split(' - '), d = _b[0], s = _b[1];
            return { day: d || '', shift: s || '', count: count };
        });
        // Last Visits Breakdown (Derived from visitsList now)
        var lastVisits = __spreadArray([], visitsList, true).sort(function (a, b) { return b.date.getTime() - a.date.getTime(); })
            .slice(0, 5)
            .map(function (v) {
            var hour = (0, date_fns_1.getHours)(v.date);
            var shift = 'Madrugada';
            if (hour >= 6 && hour < 12)
                shift = 'Manhã';
            else if (hour >= 12 && hour < 18)
                shift = 'Tarde';
            else if (hour >= 18)
                shift = 'Noite';
            return {
                date: v.date,
                shift: shift,
                total: v.totalValue,
                washCount: v.washCount,
                dryCount: v.dryCount
            };
        });
        // Predictive Churn
        var daysSinceFirst = (0, date_fns_1.differenceInDays)(today, firstVisitDate);
        // If they only came once, assume a standard 20-day interval to evaluate churn risk
        // A typical washing cycle is 15-20 days.
        var averageInterval = totalVisits > 1 ? daysSinceFirst / (totalVisits - 1) : 20;
        var churnRisk = 'low';
        // Base grace periods: 30 days for high, 15 days for medium
        // But also check if they are way past their personal average interval (1.5x for medium, 2x for high)
        if (recency > Math.max(averageInterval * 2, 30))
            churnRisk = 'high';
        else if (recency > Math.max(averageInterval * 1.5, 15))
            churnRisk = 'medium';
        var nextPredictedVisit = new Date(lastVisitDate);
        nextPredictedVisit.setDate(nextPredictedVisit.getDate() + Math.ceil(averageInterval));
        // ... (existing code)
        // Demographics
        var birthDate = (_d = sales.find(function (s) { return s.birthDate; })) === null || _d === void 0 ? void 0 : _d.birthDate;
        var age = (_e = sales.find(function (s) { return s.age; })) === null || _e === void 0 ? void 0 : _e.age;
        // ----------------------------------------------------
        // ENRICHMENT: Registry Data Integration
        // ----------------------------------------------------
        var normalizedName = name_2.trim().toUpperCase();
        var registryData = registryMap.get(normalizedName);
        // Optimization: Try to find by ID first if record has it
        var recordWithId = sales.find(function (s) { return s.customerId; });
        if (recordWithId === null || recordWithId === void 0 ? void 0 : recordWithId.customerId) {
            var byId = registryMapById.get(String(recordWithId.customerId));
            if (byId)
                registryData = byId;
        }
        var gender = 'U';
        var registrationDate = undefined;
        var cpf = undefined;
        var email = undefined;
        if (registryData) {
            if (registryData.gender)
                gender = registryData.gender;
            if (registryData.registrationDate)
                registrationDate = registryData.registrationDate;
            if (registryData.cpf)
                cpf = registryData.cpf;
            if (registryData.email)
                email = registryData.email;
        }
        // Fallback: Infer gender if not in registry (or if registry didn't have it)
        // UPDATE: User requested to strictly use VMPay data. No manual inference.
        // if (gender === 'U') {
        //     gender = inferGender(name);
        // }
        // Correct Start Date: Use Registration Date if earlier than First Visit
        var finalFirstVisit = firstVisitDate;
        if (registrationDate && registrationDate < firstVisitDate) {
            finalFirstVisit = registrationDate;
        }
        // Prefer registry phone if available
        var phone = (registryData === null || registryData === void 0 ? void 0 : registryData.phone) || phoneMap[name_2] || ((_f = __spreadArray([], sales, true).reverse().find(function (s) { return s.telefone; })) === null || _f === void 0 ? void 0 : _f.telefone) || '';
        profiles.push({
            name: name_2,
            totalSpent: totalSpent,
            totalBaskets: totalBaskets_1,
            totalVisits: totalVisits,
            avgBasketsPerVisit: avgBasketsPerVisit,
            lastVisitDate: lastVisitDate,
            recency: recency,
            spent30d: spent30d,
            spent90d: spent90d,
            topDay: topDay,
            topShift: topShift,
            firstVisitDate: finalFirstVisit,
            phone: phone,
            email: email,
            cpf: cpf,
            registrationDate: registrationDate,
            spent180d: spent180d,
            baskets180d: baskets180d,
            topSlots: topSlots,
            averageTicket: averageTicket,
            totalWashes: profileWashCount,
            totalDries: profileDryCount,
            totalCycles: profileTotalCycles,
            lastVisits: lastVisits,
            averageInterval: averageInterval,
            churnRisk: churnRisk,
            nextPredictedVisit: nextPredictedVisit,
            age: age,
            birthDate: birthDate,
            gender: gender,
            preferredStore: preferredStore
        });
    };
    for (var i = 0; i < customerEntries.length; i++) {
        _loop_1(i);
    }
    // ... (rest of function)
    // ... (rest of function)
    // Sort by Total Spent Descending (for Top 15)
    profiles.sort(function (a, b) { return b.totalSpent - a.totalSpent; });
    // Global Stats
    var totalUniqueCustomers = profiles.length;
    var totalBaskets = 0;
    var active30d = 0;
    var inactive30 = 0;
    var inactive60 = 0;
    var inactive90 = 0;
    var newCustomers = 0;
    var recurring = 0;
    var totalRevenue = 0;
    var totalVisitsGlobal = 0;
    var sumFreq = 0;
    var freqCount = 0;
    var churnRiskStats = { high: 0, medium: 0, low: 0 };
    var startOf30d = (0, date_fns_1.subDays)(today, 30);
    var startOf60d = (0, date_fns_1.subDays)(today, 60);
    var startOf90d = (0, date_fns_1.subDays)(today, 90);
    for (var i = 0; i < profiles.length; i++) {
        var p = profiles[i];
        var last = p.lastVisitDate;
        var first = p.firstVisitDate;
        totalRevenue += p.totalSpent;
        totalVisitsGlobal += p.totalVisits;
        churnRiskStats[p.churnRisk]++;
        if ((0, date_fns_1.isAfter)(last, startOf30d))
            active30d++;
        else if ((0, date_fns_1.isAfter)(last, startOf60d))
            inactive30++;
        else if ((0, date_fns_1.isAfter)(last, startOf90d))
            inactive60++;
        else
            inactive90++;
        if ((0, date_fns_1.isAfter)(first, startOf30d))
            newCustomers++;
        if (p.totalVisits > 1)
            recurring++;
        // Frequency (Visits / Month)
        var daysSinceFirst = Math.max(todayTs - p.firstVisitDate.getTime(), 1000) / (1000 * 60 * 60 * 24);
        var months = Math.max(daysSinceFirst, 1) / 30;
        if (months < 1)
            months = 1;
        sumFreq += p.totalVisits / months;
        freqCount++;
    }
    var avgTypeFrequency = freqCount > 0 ? sumFreq / freqCount : 0;
    var globalAverageTicket = totalVisitsGlobal > 0 ? totalRevenue / totalVisitsGlobal : 0;
    var globalAvgBasketsPerVisit = 0;
    var avgLtv = totalUniqueCustomers > 0 ? (totalRevenue / totalUniqueCustomers) : 0;
    var retentionRate = totalUniqueCustomers > 0 ? recurring / totalUniqueCustomers : 0;
    var churnRate = totalUniqueCustomers > 0 ? inactive90 / totalUniqueCustomers : 0;
    // Final Aggregates
    var activeCustomers = active30d + newCustomers + recurring;
    var totalCyclesGlobal = washCount + dryCount;
    var conversionRate = washCount > 0 ? (dryCount / washCount) * 100 : 0;
    console.timeEnd(profilerLabel);
    return {
        profiles: profiles,
        globalAvgBasketsPerVisit: globalAvgBasketsPerVisit,
        globalAverageTicket: globalAverageTicket,
        totalUniqueCustomers: totalUniqueCustomers,
        totalCycles: totalCyclesGlobal,
        totalRevenue: totalRevenue,
        totalVisits: totalVisitsGlobal,
        totalBaskets: totalCyclesGlobal,
        activeCustomers: activeCustomers,
        churnRate: churnRate,
        washDryStats: {
            washCount: washCount,
            dryCount: dryCount,
            ratio: washCount > 0 ? dryCount / washCount : 0,
            totalBaskets: totalCyclesGlobal,
            conversionRate: conversionRate
        },
        customerStats: {
            active30d: active30d,
            newCustomers: newCustomers,
            recurring: recurring,
            inactive30: inactive30,
            inactive60: inactive60,
            inactive90: inactive90,
            churnRiskStats: churnRiskStats,
            avgTypeFrequency: avgTypeFrequency,
            avgLtv: avgLtv,
            retentionRate: retentionRate,
            churnRate: churnRate
        }
    };
}
function calculatePeriodStats(periodRecords, allRecords, allOrders) {
    var profilerLabel = "calculatePeriodStats(".concat(periodRecords.length, ")");
    console.time(profilerLabel);
    // 1. Group Period Records by Customer
    var periodCustomers = {};
    var totalRevenue = 0;
    var totalVisits = 0;
    for (var i = 0; i < periodRecords.length; i++) {
        var r = periodRecords[i];
        var name_3 = r.cliente.trim().toUpperCase();
        if (!name_3 || name_3 === "PEDIDO BALCÃO" || name_3 === "CONSUMIDOR FINAL")
            continue;
        if (name_3.includes("ADMIN") || name_3.includes("TESTE"))
            continue;
        if (!periodCustomers[name_3])
            periodCustomers[name_3] = [];
        periodCustomers[name_3].push(r);
        totalRevenue += r.valor;
    }
    var activeCustomersKeys = Object.keys(periodCustomers);
    var activeCustomers = activeCustomersKeys.length;
    // 2. Initialize Lists
    var onlyWashList = [];
    var onlyDryList = [];
    var washAndDryList = [];
    var unclassifiedList = [];
    var newCustomers = 0;
    var newCustomersList = [];
    var washAndDryBalancedCount = 0;
    // Pre-process ALL records for history lookup and phone mapping
    var fullHistoryMap = {};
    var phoneMap = {};
    var globalMinCyclePrice = 18.0;
    var storeCyclePrices = {};
    var possibleCyclePrices = [];
    if (activeCustomers > 0) {
        allRecords.forEach(function (r) {
            var name = r.cliente.trim().toUpperCase();
            // Build Phone Map (Save the most recent non-empty phone)
            if (r.telefone && r.telefone.length > 5) {
                phoneMap[name] = r.telefone;
            }
            if (periodCustomers[name]) {
                if (!fullHistoryMap[name])
                    fullHistoryMap[name] = [];
                fullHistoryMap[name].push(r.data.getTime());
            }
            // Estimate Cycle Prices
            if (r.valor >= 8.0 && r.valor <= 25.0) {
                possibleCyclePrices.push(r.valor);
                var store = (r.loja || 'DEFAULT').toUpperCase();
                if (!storeCyclePrices[store] || r.valor < storeCyclePrices[store]) {
                    storeCyclePrices[store] = r.valor;
                }
            }
        });
        Object.values(fullHistoryMap).forEach(function (dates) { return dates.sort(function (a, b) { return a - b; }); });
        if (possibleCyclePrices.length > 0) {
            possibleCyclePrices.sort(function (a, b) { return a - b; });
            var p10Index = Math.floor(possibleCyclePrices.length * 0.1);
            globalMinCyclePrice = possibleCyclePrices[p10Index] || 18.0;
        }
    }
    activeCustomersKeys.forEach(function (name) {
        var _a, _b, _c, _d, _e, _f;
        var sales = periodCustomers[name];
        // --- A. Visit Counting ---
        var uniqueDaysStr = new Set(sales.map(function (s) { return s.data.toDateString(); }));
        totalVisits += uniqueDaysStr.size;
        // --- B. New Customer Logic ---
        var firstVisitInPeriod = sales.reduce(function (min, r) { return r.data < min ? r.data : min; }, sales[0].data);
        var firstVisitTime = firstVisitInPeriod.getTime();
        var history = fullHistoryMap[name] || [];
        var priorVisits = history.filter(function (t) { return t < firstVisitTime; });
        if (priorVisits.length === 0) {
            newCustomers++;
            newCustomersList.push(name);
        }
        else {
            var lastPriorVisit = priorVisits[priorVisits.length - 1];
            var diffDays = (firstVisitTime - lastPriorVisit) / (1000 * 60 * 60 * 24);
            if (diffDays > 180) {
                newCustomers++;
                newCustomersList.push(name);
            }
        }
        // --- C. Wash/Dry Segmentation ---
        var wCount = 0;
        var dCount = 0;
        sales.forEach(function (r) {
            var saleOrders = allOrders ? allOrders.filter(function (o) { return o.sale_id === r.id; }) : [];
            if (saleOrders.length > 0) {
                // Precision: Count exact baskets from the orders table
                saleOrders.forEach(function (o) {
                    var _a = detectCycleType(o.service, o.machine, r.loja), isWash = _a.isWash, isDry = _a.isDry;
                    if (isWash)
                        wCount++;
                    if (isDry)
                        dCount++;
                });
            }
            else if (r.items && r.items.length > 0) {
                // Fallback nested items
                r.items.forEach(function (item) {
                    var _a = detectCycleType(item.service, item.machine, r.loja), isWash = _a.isWash, isDry = _a.isDry;
                    if (isWash)
                        wCount++;
                    if (isDry)
                        dCount++;
                });
            }
            else {
                // Heuristic Fallback
                var _a = detectCycleType(r.produto, '', r.loja), isWash = _a.isWash, isDry = _a.isDry;
                if (isWash)
                    wCount++;
                if (isDry)
                    dCount++;
                var store = (r.loja || 'DEFAULT').toUpperCase();
                var basePrice = (storeCyclePrices && storeCyclePrices[store]) || globalMinCyclePrice || 18.0;
                if ((wCount > 0 || dCount > 0) && r.valor > basePrice * 1.5) {
                    var impliedCount = Math.round(r.valor / basePrice);
                    if (impliedCount > 1) {
                        if (wCount > 0 && dCount === 0)
                            wCount = impliedCount;
                        else if (dCount > 0 && wCount === 0)
                            dCount = impliedCount;
                    }
                }
            }
        });
        // Find preferred store for period
        var storeCounts = {};
        sales.forEach(function (s) {
            if (s.loja)
                storeCounts[s.loja] = (storeCounts[s.loja] || 0) + 1;
        });
        var preferredStore = (_a = Object.entries(storeCounts).sort(function (a, b) { return b[1] - a[1]; })[0]) === null || _a === void 0 ? void 0 : _a[0];
        // Create Customer Info Object
        var lastSale = sales[sales.length - 1];
        var custInfo = {
            name: name,
            phone: phoneMap[name] || ((_b = __spreadArray([], sales, true).reverse().find(function (s) { return s.telefone && s.telefone.length > 5; })) === null || _b === void 0 ? void 0 : _b.telefone) || '',
            wCount: wCount,
            dCount: dCount,
            totalSpent: sales.reduce(function (acc, r) { return acc + r.valor; }, 0),
            lastVisit: sales.reduce(function (max, r) { return r.data > max ? r.data : max; }, new Date(0)),
            debugInfo: lastSale ? "".concat(lastSale.produto, " (Itens: ").concat(((_c = lastSale.items) === null || _c === void 0 ? void 0 : _c.length) || 0, ")") : 'N/A',
            preferredStore: preferredStore
        };
        // Classification
        if (wCount > 0 && dCount === 0) {
            onlyWashList.push(custInfo);
        }
        else if (dCount > 0 && wCount === 0) {
            onlyDryList.push(custInfo);
        }
        else if (wCount > 0 && dCount > 0) {
            washAndDryList.push(custInfo);
            if (wCount === dCount) {
                washAndDryBalancedCount++;
            }
        }
        else {
            // Unclassified (Neither wash nor dry detected)
            // Enhanced Debugging: Why is it 0?
            var lastProd = ((lastSale === null || lastSale === void 0 ? void 0 : lastSale.produto) || '').toLowerCase();
            var val = ((_d = lastSale === null || lastSale === void 0 ? void 0 : lastSale.valor) === null || _d === void 0 ? void 0 : _d.toFixed(2)) || '0.00';
            var itensCount = ((_e = lastSale === null || lastSale === void 0 ? void 0 : lastSale.items) === null || _e === void 0 ? void 0 : _e.length) || 0;
            var type = '[OUTROS]';
            // Check if it's purely products
            var isProduct = lastProd.includes('detergente') ||
                lastProd.includes('amaciante') ||
                lastProd.includes('sabao') ||
                lastProd.includes('sabonete') ||
                lastProd.includes('cartao') ||
                lastProd.includes('fidelidade') ||
                lastProd.includes('sacola') ||
                lastProd.includes('saco');
            if (isProduct)
                type = '[PRODUTO]';
            // Check if it's a failed machine match
            if (itensCount > 0 && type === '[OUTROS]') {
                type = '[ERRO VINCULO]';
                // Try to show what was in the items
                var itemDump = ((_f = lastSale === null || lastSale === void 0 ? void 0 : lastSale.items) === null || _f === void 0 ? void 0 : _f.map(function (i) { return "".concat(i.machine, "/").concat(i.service); }).join(', ')) || '';
                custInfo.debugInfo = "".concat(type, " Itens: ").concat(itemDump);
            }
            else {
                custInfo.debugInfo = "".concat(type, " ").concat(lastSale === null || lastSale === void 0 ? void 0 : lastSale.produto, " (R$ ").concat(val, ")");
            }
            unclassifiedList.push(custInfo);
        }
    });
    console.timeEnd(profilerLabel);
    return {
        activeCustomers: activeCustomers,
        newCustomers: newCustomers,
        newCustomersList: newCustomersList,
        onlyWashCount: onlyWashList.length,
        onlyDryCount: onlyDryList.length,
        washAndDryCount: washAndDryList.length,
        washAndDryBalancedCount: washAndDryBalancedCount,
        onlyWashList: onlyWashList,
        onlyDryList: onlyDryList,
        washAndDryList: washAndDryList,
        unclassifiedList: unclassifiedList,
        totalRevenue: totalRevenue,
        totalVisits: totalVisits,
        avgTicket: totalVisits > 0 ? totalRevenue / totalVisits : 0,
        avgLtv: activeCustomers > 0 ? totalRevenue / activeCustomers : 0
    };
}
function calculateOccupancyHeatmap(records) {
    // 1. Initialize 7x24 Matrix
    var matrix = Array.from({ length: 7 }, function () { return Array(24).fill(0); });
    // 2. Populate Matrix
    records.forEach(function (r) {
        if (!r.data)
            return;
        var d = (0, date_fns_1.getDay)(r.data);
        var h = (0, date_fns_1.getHours)(r.data);
        // Ensure within bounds (just in case)
        if (matrix[d] && matrix[d][h] !== undefined) {
            matrix[d][h]++;
        }
    });
    return matrix;
}
function calculateVisitsHeatmap(records) {
    var matrix = Array.from({ length: 7 }, function () { return Array(24).fill(0); });
    var processedVisits = new Set(); // "YYYY-MM-DD-HH-Client"
    records.forEach(function (r) {
        if (!r.data)
            return;
        var d = (0, date_fns_1.getDay)(r.data);
        var h = (0, date_fns_1.getHours)(r.data);
        var dayStr = r.data.toISOString().split('T')[0];
        var visitKey = "".concat(dayStr, "-").concat(h, "-").concat(r.cliente);
        // Count unique visits (user sessions) per hour, not just every transaction
        if (!processedVisits.has(visitKey)) {
            if (matrix[d] && matrix[d][h] !== undefined) {
                matrix[d][h]++;
                processedVisits.add(visitKey);
            }
        }
    });
    return matrix;
}
function getCycleDuration(productName) {
    var p = (productName || '').toLowerCase();
    if (p.includes('sec'))
        return 49; // Secadora: 49 min
    return 33; // Lavadora: 33 min
}
function getProfile(customerName, allRecords, allOrders) {
    if (!customerName || !allRecords)
        return null;
    // Filter records for this specific customer
    var customerRecords = allRecords.filter(function (r) {
        return r.cliente && r.cliente.trim().toUpperCase() === customerName.trim().toUpperCase();
    });
    if (customerRecords.length === 0)
        return null;
    // Reuse existing calculation logic by passing only this customer's records
    var summary = calculateCrmMetrics(customerRecords, undefined, allOrders);
    return summary.profiles[0] || null;
}
function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function inferGender(name) {
    if (!name)
        return 'U';
    // Normalize: Remove extra spaces, uppercase, remove accents
    var cleanName = removeAccents(name.trim().toUpperCase());
    var parts = cleanName.split(' ');
    var first = parts[0];
    // 1. Common Exceptions Map (Expanded)
    var exceptions = {
        // Male Exceptions (ending in A, etc)
        'LUCA': 'M', 'LUKA': 'M', 'JEAN': 'M', 'RYAN': 'M', 'YAN': 'M',
        'MICHEL': 'M', 'ELIAS': 'M', 'JONAS': 'M', 'LUCAS': 'M', 'MATHEUS': 'M',
        'THOMAS': 'M', 'TOMAS': 'M', 'NICOLAS': 'M', 'DOUGLAS': 'M',
        'ALEX': 'M', 'ALEXANDRE': 'M', 'ANDRE': 'M', 'FELIPE': 'M',
        'JORGE': 'M', 'THIAGO': 'M', 'DIEGO': 'M', 'DIOGO': 'M',
        'HUGO': 'M', 'BRUNO': 'M', 'CAIO': 'M', 'BRENO': 'M',
        'IGOR': 'M', 'VITOR': 'M', 'ARTHUR': 'M', 'DAVI': 'M', 'DAVID': 'M',
        'KAUAN': 'M', 'CAUA': 'M', 'LUIZ': 'M', 'LUIS': 'M', 'ISAAC': 'M',
        'GABRIEL': 'M', 'MIGUEL': 'M', 'SAMUEL': 'M', 'DANIEL': 'M',
        'RAFAEL': 'M', 'LEONARDO': 'M', 'GUSTAVO': 'M', 'GUILHERME': 'M',
        'PEDRO': 'M', 'PAULO': 'M', 'JOAO': 'M', 'JOSE': 'M', 'CARLOS': 'M',
        'EDUARDO': 'M', 'RENATO': 'M', 'RICARDO': 'M', 'ROBERTO': 'M',
        'FABIO': 'M', 'MARCIO': 'M', 'MARCELO': 'M', 'FLAVIO': 'M',
        'SERGIO': 'M', 'FERNANDO': 'M', 'HENRIQUE': 'M', 'VINICIUS': 'M',
        'RODRIGO': 'M',
        // Female Exceptions (not ending in A)
        'BEATRIZ': 'F', 'LAIS': 'F', 'THAIS': 'F', 'LIZ': 'F', 'ESTER': 'F',
        'NAIR': 'F', 'RAQUEL': 'F', 'RUTH': 'F', 'INES': 'F', 'ALICE': 'F',
        'CLARICE': 'F', 'JANICE': 'F', 'LURDES': 'F', 'ELIZABETH': 'F',
        'INGRID': 'F', 'ASTRID': 'F', 'ROSE': 'F', 'SIMONE': 'F', 'IVONE': 'F',
        'IRENE': 'F', 'SOLANGE': 'F', 'MONIQUE': 'F', 'JAQUELINE': 'F',
        'CAROLINE': 'F', 'CRISTIANE': 'F', 'VIVIANE': 'F', 'TATIANE': 'F',
        'JOSIANE': 'F', 'LUCIANE': 'F', 'ELIANE': 'F', 'ARIANE': 'F',
        'ADRIANE': 'F', 'JULIANE': 'F', 'MARIANE': 'F', 'ALINE': 'F'
    };
    if (exceptions[first])
        return exceptions[first];
    // 2. Strong Suffix Rules
    if (first.endsWith('A'))
        return 'F';
    if (first.endsWith('O'))
        return 'M';
    // 3. Heuristic for other endings
    // Names ending in 'E' can be tricky, but many common female names end in 'E' (Alice, Simone...) 
    // and many male (Felipe, Andre, Jorge...).
    // The exceptions list handles the most common ones.
    // Let's assume 'E' is Female unless in male exceptions? Or Male?
    // In PT-BR:
    // M: Felipe, Andre, Jorge, Henrique, Alexandre, Guilherme...
    // F: Alice, Simone, Ivone, Irene, Solange, Monique, Jaqueline...
    // It's a mix. Let's start with U if simpler rules don't catch it.
    // Names ending in consonants:
    // M: Gabriel, Miguel, Daniel, Rafael, Samuel, Davi(d), Lui(z)
    // F: Raque(l), Ester(r), Bea(triz)
    // Ending in 'EL' -> Generally Male (Gabriel, Daniel, Michel) - BUT Raquel, Isabel
    if (first.endsWith('EL') && first !== 'RAQUEL' && first !== 'ISABEL' && first !== 'MABEL')
        return 'M';
    // Ending in 'OS' -> Male (Marcos, Carlos, Santos)
    if (first.endsWith('OS'))
        return 'M';
    // Ending in 'US' -> Male (Mateus, Vinicius)
    if (first.endsWith('US'))
        return 'M';
    // Ending in 'OR' -> Male (Vitor, Igor, Junior)
    if (first.endsWith('OR'))
        return 'M';
    return 'U';
}
/**
 * Lightweight version of visit counting logic for Dashboards.
 * Uses the 180-minute window rule.
 */
function calculateVisitCount(records) {
    if (records.length === 0)
        return 0;
    // 1. Group by customer first (essential for visit definition)
    var customerSales = {};
    for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (!r.cliente)
            continue;
        var name_4 = r.cliente.trim().toUpperCase();
        if (name_4 === "CONSUMIDOR FINAL" || name_4 === "PEDIDO BALCÃO")
            continue;
        if (!customerSales[name_4])
            customerSales[name_4] = [];
        customerSales[name_4].push(r.data.getTime());
    }
    var totalVisits = 0;
    var windowMs = 180 * 60 * 1000;
    var entries = Object.values(customerSales);
    for (var i = 0; i < entries.length; i++) {
        var timestamps = entries[i].sort(function (a, b) { return a - b; });
        if (timestamps.length === 0)
            continue;
        totalVisits++; // Start first visit
        var currentVisitStart = timestamps[0];
        for (var j = 1; j < timestamps.length; j++) {
            if (timestamps[j] - currentVisitStart > windowMs) {
                totalVisits++;
                currentVisitStart = timestamps[j];
            }
        }
    }
    return totalVisits;
}
