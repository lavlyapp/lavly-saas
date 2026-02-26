import { SaleRecord, CustomerRecord } from "./etl";
import { differenceInDays, getDay, getHours, isAfter, subDays, differenceInMinutes } from "date-fns";

export interface CustomerProfile {
    name: string;
    totalSpent: number;
    totalBaskets: number;
    totalVisits: number;
    avgBasketsPerVisit: number;
    lastVisitDate: Date;
    recency: number; // Days since last visit

    // Period Spending
    spent30d: number;
    spent90d: number;

    // Preferences
    topDay: string;
    topShift: string;

    // New Fields
    firstVisitDate: Date;
    phone: string;
    email?: string; // New
    cpf?: string; // New
    preferredStore?: string; // New

    // Details View Metrics
    spent180d: number;
    baskets180d: number; // Will be 0 for now
    topSlots: { day: string; shift: string; count: number }[];

    // New Metric
    averageTicket: number;
    totalWashes: number; // New: Separated Count
    totalDries: number; // New: Separated Count
    totalCycles: number; // Total Washes + Dries
    lastVisits: {
        date: Date;
        shift: string;
        total: number;
        washCount: number;
        dryCount: number;
    }[];

    // Predictive Churn
    averageInterval: number;
    churnRisk: 'low' | 'medium' | 'high';
    nextPredictedVisit: Date;

    // Demographics
    age?: number;
    birthDate?: Date;
    gender?: 'M' | 'F' | 'U'; // M=Male, F=Female, U=Unknown
    registrationDate?: Date; // New
}

export interface CrmSummary {
    profiles: CustomerProfile[];
    globalAvgBasketsPerVisit: number; // Will be 0
    globalAverageTicket: number; // New
    totalUniqueCustomers: number;
    totalCycles: number; // Global total cycles
    totalRevenue: number; // New
    totalVisits: number; // New
    totalBaskets: number; // Will be 0
    activeCustomers: number; // New: Pulled up for easier access
    churnRate: number; // New: Pulled up for easier access
    washDryStats: {
        washCount: number;
        dryCount: number;
        ratio: number;
        totalBaskets: number; // New
        conversionRate: number; // New
    };
    customerStats: {
        active30d: number;
        newCustomers: number;
        recurring: number;
        inactive30: number; // 30-60 days inactive
        inactive60: number; // 60-90 days inactive
        inactive90: number; // >90 days inactive (churn stats)
        churnRiskStats: {
            high: number;
            medium: number;
            low: number;
        };
        avgTypeFrequency: number; // visits/month average
        avgLtv: number;
        retentionRate: number; // % Recurring / Total
        churnRate: number; // % Inactive90 / Total
    };
}

const DAYS_MAP = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function detectCycleType(service: string, machine: string, store: string): { isWash: boolean, isDry: boolean } {
    const svc = (service || '').toLowerCase();
    const mac = (machine || '').toLowerCase();
    const sto = (store || '').toUpperCase();

    const isLavateria = sto.includes('LAVATERIA');
    const machineNumMatch = mac.match(/\d+/);
    const machineNum = machineNumMatch ? parseInt(machineNumMatch[0], 10) : NaN;

    if (isLavateria && !isNaN(machineNum)) {
        // Regra Lavateria: Par = Lavagem, Ímpar = Secagem
        return { isWash: machineNum % 2 === 0, isDry: machineNum % 2 !== 0 };
    }

    // Regras Gerais
    const isWash = svc.includes('lav') || mac.includes('lav') || /^l\d/i.test(mac) || /30\s*min/i.test(svc) || /35\s*min/i.test(svc);
    const isDry = svc.includes('sec') || mac.includes('sec') || /^s\d/i.test(mac) || /45\s*min/i.test(svc) || /15\s*min/i.test(svc);

    return { isWash, isDry };
}

export function calculateCrmMetrics(records: SaleRecord[], customerRegistry?: CustomerRecord[]): CrmSummary {
    const profilerLabel = `calculateCrmMetrics(${records.length})`;
    console.time(profilerLabel);

    const customers: Record<string, SaleRecord[]> = {};
    let washCount = 0;
    let dryCount = 0;
    let totalCycles = 0;
    const profiles: CustomerProfile[] = [];

    // Build Registry Maps
    const registryMap = new Map<string, CustomerRecord>();
    const registryMapById = new Map<string, CustomerRecord>();
    if (customerRegistry) {
        for (let i = 0; i < customerRegistry.length; i++) {
            const c = customerRegistry[i];
            if (c.id) registryMapById.set(String(c.id), c);
            if (c.name && c.name.length > 2) {
                registryMap.set(c.name.trim().toUpperCase(), c);
            }
        }
    }

    // 1. Single Pass for Min/Max date, possible prices, and grouping
    let latestTimestamp = 0;
    records.forEach(r => {
        const ts = r.data.getTime();
        if (ts > latestTimestamp) latestTimestamp = ts;
    });
    const today = latestTimestamp > 0 ? new Date(latestTimestamp) : new Date();
    const todayTs = today.getTime();

    let globalMinCyclePrice = 18.0;
    const storeCyclePrices: Record<string, number> = {};
    const possibleCyclePrices: number[] = [];
    const phoneMap: Record<string, string> = {};

    for (let i = 0; i < records.length; i++) {
        const r = records[i];

        // Price detection logic
        if (r.valor >= 8.0 && r.valor <= 25.0) {
            possibleCyclePrices.push(r.valor);
            const store = (r.loja || 'DEFAULT').toUpperCase();
            if (!storeCyclePrices[store] || r.valor < storeCyclePrices[store]) {
                storeCyclePrices[store] = r.valor;
            }
        }

        // Grouping logic
        if (!r.cliente) continue;
        const name = r.cliente.trim().toUpperCase();
        if (name === "CONSUMIDOR FINAL" || name === "PEDIDO BALCÃO") continue;
        if (name.includes("ADMIN") || name.includes("TESTE")) continue;

        if (r.telefone && r.telefone.length > 5) {
            phoneMap[name] = r.telefone;
        }

        if (!customers[name]) customers[name] = [];
        customers[name].push(r);
    }

    if (possibleCyclePrices.length > 0) {
        possibleCyclePrices.sort((a, b) => a - b);
        const p10Index = Math.floor(possibleCyclePrices.length * 0.1);
        globalMinCyclePrice = possibleCyclePrices[p10Index] || 18.0;
    }

    const customerEntries = Object.entries(customers);
    for (let i = 0; i < customerEntries.length; i++) {
        const [name, sales] = customerEntries[i];
        // ... (sorting)

        // Calculate Visits & Last 5 Visits Details
        // Sort sales by date ascending for grouping logic
        sales.sort((a, b) => a.data.getTime() - b.data.getTime());

        // New Grouping Logic: 180-minute window = 1 Visit
        // A visit is defined by the first purchase time. Any purchase within 180 minutes belongs to it.
        const visitsList: { date: Date, items: SaleRecord[], totalValue: number, washCount: number, dryCount: number }[] = [];

        let profileWashCount = 0;
        let profileDryCount = 0;

        sales.forEach(r => {
            // Count Cycles per Sale Item (Independent of Visit grouping for totals)
            let wDetails = 0;
            let dDetails = 0;

            if (r.items && r.items.length > 0) {
                r.items.forEach(item => {
                    const { isWash, isDry } = detectCycleType(item.service, item.machine, r.loja);
                    if (isWash) wDetails++;
                    if (isDry) dDetails++;
                });
            } else {
                const { isWash, isDry } = detectCycleType(r.produto, '', r.loja);
                if (isWash) wDetails++;
                if (isDry) dDetails++;

                const store = (r.loja || 'DEFAULT').toUpperCase();

                // Heuristic: Determine the base price for this transaction
                const basePrice = storeCyclePrices[store] || globalMinCyclePrice || 18.0;

                // If neither wash nor dry was explicitly found in the name, but value is high, we can infer some distribution.
                const impliedCount = Math.round(r.valor / basePrice);

                if (impliedCount > 0 && wDetails === 0 && dDetails === 0) {
                    // If we have no clue, assume 50/50 split or just default to washing if odd
                    wDetails = Math.ceil(impliedCount / 2);
                    dDetails = Math.floor(impliedCount / 2);
                } else if ((wDetails > 0 || dDetails > 0) && r.valor > basePrice * 1.5) {
                    if (impliedCount > 1) {
                        if (wDetails > 0 && dDetails === 0) wDetails = impliedCount;
                        else if (dDetails > 0 && wDetails === 0) dDetails = impliedCount;
                    }
                }
            }

            profileWashCount += wDetails;
            profileDryCount += dDetails;

            // Visit Grouping Logic
            const lastVisit = visitsList.length > 0 ? visitsList[visitsList.length - 1] : null; // Get last added visit

            // Check if current sale fits in the 180-minute window of the last visit
            // Window starts at `lastVisit.date` (which is the first sale time of that visit)
            if (lastVisit && differenceInMinutes(r.data, lastVisit.date) <= 180 && differenceInMinutes(r.data, lastVisit.date) >= 0) {
                lastVisit.items.push(r);
                lastVisit.totalValue += r.valor;
                lastVisit.washCount += wDetails;
                lastVisit.dryCount += dDetails;
            } else {
                // New Visit Start
                visitsList.push({
                    date: r.data,
                    items: [r],
                    totalValue: r.valor,
                    washCount: wDetails,
                    dryCount: dDetails
                });
            }
        });

        const profileTotalCycles = profileWashCount + profileDryCount;
        totalCycles += profileTotalCycles;
        washCount += profileWashCount;
        dryCount += profileDryCount;


        // Calculate Aggregates based on Visits List
        const totalVisits = visitsList.length;
        const totalSpent = sales.reduce((acc, curr) => acc + curr.valor, 0);
        const averageTicket = totalVisits > 0 ? totalSpent / totalVisits : 0;
        const totalBaskets = profileTotalCycles; // Alinhado com a definição global: 1 ciclo = 1 cesta
        const avgBasketsPerVisit = totalVisits > 0 ? totalBaskets / totalVisits : 0;

        // Dates
        // sales is sorted asc, so last is end
        const lastVisitDate = sales[sales.length - 1].data;
        const firstVisitDate = sales[0].data;
        const recency = differenceInDays(today, lastVisitDate);

        // ... existing period/pref calculations ... 
        // We need to keep lines 196-243 from original code or rewrite them.
        // Let's rewrite them briefly to ensure context is maintained since we are replacing a big chunk.

        // Period Spending (kept same)
        let spent30d = 0;
        let spent90d = 0;
        let spent180d = 0;
        let baskets180d = 0;

        const d30Ts = todayTs - 30 * 24 * 60 * 60 * 1000;
        const d90Ts = todayTs - 90 * 24 * 60 * 60 * 1000;
        const d180Ts = todayTs - 180 * 24 * 60 * 60 * 1000;

        for (let j = 0; j < sales.length; j++) {
            const s = sales[j];
            const sTs = s.data.getTime();
            if (sTs > d30Ts) spent30d += s.valor;
            if (sTs > d90Ts) spent90d += s.valor;
            if (sTs > d180Ts) {
                spent180d += s.valor;
                baskets180d++;
            }
        }

        // Preferences (kept same)
        const dayCounts: Record<string, number> = {};
        const shiftCounts: Record<string, number> = {};
        const slotCounts: Record<string, number> = {};
        const storeCounts: Record<string, number> = {};

        // Use visitsList for preferences? Or raw sales? Usually raw sales for "When do they buy".
        sales.forEach(s => {
            const dayName = DAYS_MAP[getDay(s.data)];
            const hour = getHours(s.data);
            let shift = 'Madrugada';
            if (hour >= 6 && hour < 12) shift = 'Manhã';
            else if (hour >= 12 && hour < 18) shift = 'Tarde';
            else if (hour >= 18) shift = 'Noite';

            dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
            shiftCounts[shift] = (shiftCounts[shift] || 0) + 1;
            const slotKey = `${dayName} - ${shift}`;
            slotCounts[slotKey] = (slotCounts[slotKey] || 0) + 1;
            if (s.loja) {
                storeCounts[s.loja] = (storeCounts[s.loja] || 0) + 1;
            }
        });

        const preferredStore = Object.entries(storeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        const topDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        const topShift = Object.entries(shiftCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        const topSlots = Object.entries(slotCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([key, count]) => {
                const [d, s] = key.split(' - ');
                return { day: d || '', shift: s || '', count };
            });

        // Last Visits Breakdown (Derived from visitsList now)
        const lastVisits = [...visitsList]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 5)
            .map(v => {
                const hour = getHours(v.date);
                let shift = 'Madrugada';
                if (hour >= 6 && hour < 12) shift = 'Manhã';
                else if (hour >= 12 && hour < 18) shift = 'Tarde';
                else if (hour >= 18) shift = 'Noite';

                return {
                    date: v.date,
                    shift,
                    total: v.totalValue,
                    washCount: v.washCount,
                    dryCount: v.dryCount
                };
            });

        // Predictive Churn
        const daysSinceFirst = differenceInDays(today, firstVisitDate);
        // If they only came once, assume a standard 20-day interval to evaluate churn risk
        // A typical washing cycle is 15-20 days.
        const averageInterval = totalVisits > 1 ? daysSinceFirst / (totalVisits - 1) : 20;

        let churnRisk: 'low' | 'medium' | 'high' = 'low';
        // Base grace periods: 30 days for high, 15 days for medium
        // But also check if they are way past their personal average interval (1.5x for medium, 2x for high)
        if (recency > Math.max(averageInterval * 2, 30)) churnRisk = 'high';
        else if (recency > Math.max(averageInterval * 1.5, 15)) churnRisk = 'medium';

        const nextPredictedVisit = new Date(lastVisitDate);
        nextPredictedVisit.setDate(nextPredictedVisit.getDate() + Math.ceil(averageInterval));


        // ... (existing code)

        // Demographics
        const birthDate = sales.find(s => s.birthDate)?.birthDate;
        const age = sales.find(s => s.age)?.age;

        // ----------------------------------------------------
        // ENRICHMENT: Registry Data Integration
        // ----------------------------------------------------
        const normalizedName = name.trim().toUpperCase();
        let registryData = registryMap.get(normalizedName);

        // Optimization: Try to find by ID first if record has it
        const recordWithId = sales.find(s => s.customerId);
        if (recordWithId?.customerId) {
            const byId = registryMapById.get(String(recordWithId.customerId));
            if (byId) registryData = byId;
        }

        let gender: 'M' | 'F' | 'U' = 'U';
        let registrationDate: Date | undefined = undefined;
        let cpf: string | undefined = undefined;
        let email: string | undefined = undefined;

        if (registryData) {
            if (registryData.gender) gender = registryData.gender;
            if (registryData.registrationDate) registrationDate = registryData.registrationDate;
            if (registryData.cpf) cpf = registryData.cpf;
            if (registryData.email) email = registryData.email;
        }

        // Fallback: Infer gender if not in registry (or if registry didn't have it)
        // UPDATE: User requested to strictly use VMPay data. No manual inference.
        // if (gender === 'U') {
        //     gender = inferGender(name);
        // }

        // Correct Start Date: Use Registration Date if earlier than First Visit
        let finalFirstVisit = firstVisitDate;
        if (registrationDate && registrationDate < firstVisitDate) {
            finalFirstVisit = registrationDate;
        }

        // Prefer registry phone if available
        const phone = registryData?.phone || phoneMap[name] || [...sales].reverse().find(s => s.telefone)?.telefone || '';

        profiles.push({
            name,
            totalSpent,
            totalBaskets,
            totalVisits,
            avgBasketsPerVisit,
            lastVisitDate,
            recency,
            spent30d,
            spent90d,
            topDay,
            topShift,
            firstVisitDate: finalFirstVisit,
            phone,
            email,
            cpf,
            registrationDate,
            spent180d,
            baskets180d,
            topSlots,
            averageTicket,
            totalWashes: profileWashCount,
            totalDries: profileDryCount,
            totalCycles: profileTotalCycles,
            lastVisits,
            averageInterval,
            churnRisk,
            nextPredictedVisit,
            age,
            birthDate,
            gender,
            preferredStore
        });
    }

    // ... (rest of function)

    // ... (rest of function)

    // Sort by Total Spent Descending (for Top 15)
    profiles.sort((a, b) => b.totalSpent - a.totalSpent);

    // Global Stats
    const totalUniqueCustomers = profiles.length;
    const totalBaskets = 0;

    let active30d = 0;
    let inactive30 = 0;
    let inactive60 = 0;
    let inactive90 = 0;
    let newCustomers = 0;
    let recurring = 0;
    let totalRevenue = 0;
    let totalVisitsGlobal = 0;
    let sumFreq = 0;
    let freqCount = 0;
    const churnRiskStats = { high: 0, medium: 0, low: 0 };

    const startOf30d = subDays(today, 30);
    const startOf60d = subDays(today, 60);
    const startOf90d = subDays(today, 90);

    for (let i = 0; i < profiles.length; i++) {
        const p = profiles[i];
        const last = p.lastVisitDate;
        const first = p.firstVisitDate;

        totalRevenue += p.totalSpent;
        totalVisitsGlobal += p.totalVisits;
        churnRiskStats[p.churnRisk]++;

        if (isAfter(last, startOf30d)) active30d++;
        else if (isAfter(last, startOf60d)) inactive30++;
        else if (isAfter(last, startOf90d)) inactive60++;
        else inactive90++;

        if (isAfter(first, startOf30d)) newCustomers++;
        if (p.totalVisits > 1) recurring++;

        // Frequency (Visits / Month)
        const daysSinceFirst = Math.max(todayTs - p.firstVisitDate.getTime(), 1000) / (1000 * 60 * 60 * 24);
        let months = Math.max(daysSinceFirst, 1) / 30;
        if (months < 1) months = 1;
        sumFreq += p.totalVisits / months;
        freqCount++;
    }

    const avgTypeFrequency = freqCount > 0 ? sumFreq / freqCount : 0;
    const globalAverageTicket = totalVisitsGlobal > 0 ? totalRevenue / totalVisitsGlobal : 0;
    const globalAvgBasketsPerVisit = 0;
    const avgLtv = totalUniqueCustomers > 0 ? (totalRevenue / totalUniqueCustomers) : 0;
    const retentionRate = totalUniqueCustomers > 0 ? recurring / totalUniqueCustomers : 0;
    const churnRate = totalUniqueCustomers > 0 ? inactive90 / totalUniqueCustomers : 0;

    // Final Aggregates
    const activeCustomers = active30d + newCustomers + recurring;
    const totalCyclesGlobal = washCount + dryCount;
    const conversionRate = washCount > 0 ? (dryCount / washCount) * 100 : 0;

    console.timeEnd(profilerLabel);

    return {
        profiles,
        globalAvgBasketsPerVisit,
        globalAverageTicket,
        totalUniqueCustomers,
        totalCycles: totalCyclesGlobal,
        totalRevenue,
        totalVisits: totalVisitsGlobal,
        totalBaskets: totalCyclesGlobal,
        activeCustomers,
        churnRate,
        washDryStats: {
            washCount,
            dryCount,
            ratio: washCount > 0 ? dryCount / washCount : 0,
            totalBaskets: totalCyclesGlobal,
            conversionRate
        },
        customerStats: {
            active30d,
            newCustomers,
            recurring,
            inactive30,
            inactive60,
            inactive90,
            churnRiskStats,
            avgTypeFrequency,
            avgLtv,
            retentionRate,
            churnRate
        }
    };
}

// ... existing code ...

export interface SegmentedCustomer {
    name: string;
    phone: string;
    wCount: number;
    dCount: number;
    totalSpent: number;
    lastVisit: Date;
    debugInfo?: string; // Product name for invalid items
    preferredStore?: string;
}

export interface PeriodStats {
    activeCustomers: number;
    newCustomers: number;
    newCustomersList: string[]; // Debug only

    // Counts
    onlyWashCount: number;
    onlyDryCount: number;
    washAndDryCount: number;
    washAndDryBalancedCount: number;

    // Lists for CRM Actions
    onlyWashList: SegmentedCustomer[];
    onlyDryList: SegmentedCustomer[];
    washAndDryList: SegmentedCustomer[];
    unclassifiedList: SegmentedCustomer[]; // New: Capture failures

    // Financials
    totalRevenue: number;
    totalVisits: number;
    avgTicket: number;
    avgLtv: number;
}

export function calculatePeriodStats(periodRecords: SaleRecord[], allRecords: SaleRecord[]): PeriodStats {
    const profilerLabel = `calculatePeriodStats(${periodRecords.length})`;
    console.time(profilerLabel);

    // 1. Group Period Records by Customer
    const periodCustomers: Record<string, SaleRecord[]> = {};
    let totalRevenue = 0;
    let totalVisits = 0;

    for (let i = 0; i < periodRecords.length; i++) {
        const r = periodRecords[i];
        const name = r.cliente.trim().toUpperCase();

        if (!name || name === "PEDIDO BALCÃO" || name === "CONSUMIDOR FINAL") continue;
        if (name.includes("ADMIN") || name.includes("TESTE")) continue;

        if (!periodCustomers[name]) periodCustomers[name] = [];
        periodCustomers[name].push(r);
        totalRevenue += r.valor;
    }

    const activeCustomersKeys = Object.keys(periodCustomers);
    const activeCustomers = activeCustomersKeys.length;

    // 2. Initialize Lists
    const onlyWashList: SegmentedCustomer[] = [];
    const onlyDryList: SegmentedCustomer[] = [];
    const washAndDryList: SegmentedCustomer[] = [];
    const unclassifiedList: SegmentedCustomer[] = [];

    let newCustomers = 0;
    const newCustomersList: string[] = [];

    let washAndDryBalancedCount = 0;

    // Pre-process ALL records for history lookup and phone mapping
    const fullHistoryMap: Record<string, number[]> = {};
    const phoneMap: Record<string, string> = {};

    let globalMinCyclePrice = 18.0;
    const storeCyclePrices: Record<string, number> = {};
    const possibleCyclePrices: number[] = [];

    if (activeCustomers > 0) {
        allRecords.forEach(r => {
            const name = r.cliente.trim().toUpperCase();

            // Build Phone Map (Save the most recent non-empty phone)
            if (r.telefone && r.telefone.length > 5) {
                phoneMap[name] = r.telefone;
            }

            if (periodCustomers[name]) {
                if (!fullHistoryMap[name]) fullHistoryMap[name] = [];
                fullHistoryMap[name].push(r.data.getTime());
            }

            // Estimate Cycle Prices
            if (r.valor >= 8.0 && r.valor <= 25.0) {
                possibleCyclePrices.push(r.valor);
                const store = (r.loja || 'DEFAULT').toUpperCase();
                if (!storeCyclePrices[store] || r.valor < storeCyclePrices[store]) {
                    storeCyclePrices[store] = r.valor;
                }
            }
        });
        Object.values(fullHistoryMap).forEach(dates => dates.sort((a, b) => a - b));

        if (possibleCyclePrices.length > 0) {
            possibleCyclePrices.sort((a, b) => a - b);
            const p10Index = Math.floor(possibleCyclePrices.length * 0.1);
            globalMinCyclePrice = possibleCyclePrices[p10Index] || 18.0;
        }
    }

    activeCustomersKeys.forEach(name => {
        const sales = periodCustomers[name];

        // --- A. Visit Counting ---
        const uniqueDaysStr = new Set(sales.map(s => s.data.toDateString()));
        totalVisits += uniqueDaysStr.size;

        // --- B. New Customer Logic ---
        const firstVisitInPeriod = sales.reduce((min, r) => r.data < min ? r.data : min, sales[0].data);
        const firstVisitTime = firstVisitInPeriod.getTime();
        const history = fullHistoryMap[name] || [];
        const priorVisits = history.filter(t => t < firstVisitTime);

        if (priorVisits.length === 0) {
            newCustomers++;
            newCustomersList.push(name);
        } else {
            const lastPriorVisit = priorVisits[priorVisits.length - 1];
            const diffDays = (firstVisitTime - lastPriorVisit) / (1000 * 60 * 60 * 24);
            if (diffDays > 180) {
                newCustomers++;
                newCustomersList.push(name);
            }
        }

        // --- C. Wash/Dry Segmentation ---
        let wCount = 0;
        let dCount = 0;

        sales.forEach(r => {
            if (r.items && r.items.length > 0) {
                r.items.forEach(item => {
                    const { isWash, isDry } = detectCycleType(item.service, item.machine, r.loja);
                    if (isWash) wCount++;
                    if (isDry) dCount++; // Corrected variable name
                });
            } else {
                const { isWash, isDry } = detectCycleType(r.produto, '', r.loja);
                if (isWash) wCount++;
                if (isDry) dCount++; // Corrected variable name

                const store = (r.loja || 'DEFAULT').toUpperCase();
                const basePrice = (storeCyclePrices && storeCyclePrices[store]) || globalMinCyclePrice || 18.0;

                // Heuristic: If value > basePrice * 1.5, assume multiple baskets
                if ((wCount > 0 || dCount > 0) && r.valor > basePrice * 1.5) {
                    const impliedCount = Math.round(r.valor / basePrice);
                    if (impliedCount > 1) {
                        if (wCount > 0 && dCount === 0) wCount = impliedCount;
                        else if (dCount > 0 && wCount === 0) dCount = impliedCount;
                    }
                }
            }
        });

        // Find preferred store for period
        const storeCounts: Record<string, number> = {};
        sales.forEach(s => {
            if (s.loja) storeCounts[s.loja] = (storeCounts[s.loja] || 0) + 1;
        });
        const preferredStore = Object.entries(storeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

        // Create Customer Info Object
        const lastSale = sales[sales.length - 1];
        const custInfo: SegmentedCustomer = {
            name,
            phone: phoneMap[name] || [...sales].reverse().find(s => s.telefone && s.telefone.length > 5)?.telefone || '',
            wCount,
            dCount,
            totalSpent: sales.reduce((acc, r) => acc + r.valor, 0),
            lastVisit: sales.reduce((max, r) => r.data > max ? r.data : max, new Date(0)),
            debugInfo: lastSale ? `${lastSale.produto} (Itens: ${lastSale.items?.length || 0})` : 'N/A',
            preferredStore
        };



        // Classification
        if (wCount > 0 && dCount === 0) {
            onlyWashList.push(custInfo);
        } else if (dCount > 0 && wCount === 0) {
            onlyDryList.push(custInfo);
        } else if (wCount > 0 && dCount > 0) {
            washAndDryList.push(custInfo);
            if (wCount === dCount) {
                washAndDryBalancedCount++;
            }
        } else {

            // Unclassified (Neither wash nor dry detected)
            // Enhanced Debugging: Why is it 0?
            const lastProd = (lastSale?.produto || '').toLowerCase();
            const val = lastSale?.valor?.toFixed(2) || '0.00';
            const itensCount = lastSale?.items?.length || 0;

            let type = '[OUTROS]';

            // Check if it's purely products
            const isProduct = lastProd.includes('detergente') ||
                lastProd.includes('amaciante') ||
                lastProd.includes('sabao') ||
                lastProd.includes('sabonete') ||
                lastProd.includes('cartao') ||
                lastProd.includes('fidelidade') ||
                lastProd.includes('sacola') ||
                lastProd.includes('saco');

            if (isProduct) type = '[PRODUTO]';

            // Check if it's a failed machine match
            if (itensCount > 0 && type === '[OUTROS]') {
                type = '[ERRO VINCULO]';
                // Try to show what was in the items
                const itemDump = lastSale?.items?.map(i => `${i.machine}/${i.service}`).join(', ') || '';
                custInfo.debugInfo = `${type} Itens: ${itemDump}`;
            } else {
                custInfo.debugInfo = `${type} ${lastSale?.produto} (R$ ${val})`;
            }

            unclassifiedList.push(custInfo);
        }
    });

    console.timeEnd(profilerLabel);

    return {
        activeCustomers,
        newCustomers,
        newCustomersList,
        onlyWashCount: onlyWashList.length,
        onlyDryCount: onlyDryList.length,
        washAndDryCount: washAndDryList.length,
        washAndDryBalancedCount,
        onlyWashList,
        onlyDryList,
        washAndDryList,
        unclassifiedList,
        totalRevenue,
        totalVisits,
        avgTicket: totalVisits > 0 ? totalRevenue / totalVisits : 0,
        avgLtv: activeCustomers > 0 ? totalRevenue / activeCustomers : 0
    };
}

export function calculateOccupancyHeatmap(records: SaleRecord[]): number[][] {
    // 1. Initialize 7x24 Matrix
    const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));

    // 2. Populate Matrix
    records.forEach(r => {
        if (!r.data) return;
        const d = getDay(r.data);
        const h = getHours(r.data);
        // Ensure within bounds (just in case)
        if (matrix[d] && matrix[d][h] !== undefined) {
            matrix[d][h]++;
        }
    });

    return matrix;
}

export function calculateVisitsHeatmap(records: SaleRecord[]): number[][] {
    const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
    const processedVisits = new Set<string>(); // "YYYY-MM-DD-HH-Client"

    records.forEach(r => {
        if (!r.data) return;
        const d = getDay(r.data);
        const h = getHours(r.data);
        const dayStr = r.data.toISOString().split('T')[0];
        const visitKey = `${dayStr}-${h}-${r.cliente}`;

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

export function getCycleDuration(productName: string): number {
    const p = (productName || '').toLowerCase();
    if (p.includes('sec')) return 45; // Dry = 45m (or 49m as per user, but let's stick to standard unless specified)
    // User mentioned 49m in plan? Let's check. Plan says 49.
    if (p.includes('sec')) return 49;
    return 33.5; // Wash = 33.5m
}

export function getProfile(customerName: string, allRecords: SaleRecord[]): CustomerProfile | null {
    if (!customerName || !allRecords) return null;

    // Filter records for this specific customer
    const customerRecords = allRecords.filter(r =>
        r.cliente && r.cliente.trim().toUpperCase() === customerName.trim().toUpperCase()
    );

    if (customerRecords.length === 0) return null;

    // Reuse existing calculation logic by passing only this customer's records
    const summary = calculateCrmMetrics(customerRecords);

    return summary.profiles[0] || null;
}


function removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function inferGender(name: string): 'M' | 'F' | 'U' {
    if (!name) return 'U';

    // Normalize: Remove extra spaces, uppercase, remove accents
    const cleanName = removeAccents(name.trim().toUpperCase());
    const parts = cleanName.split(' ');
    const first = parts[0];

    // 1. Common Exceptions Map (Expanded)
    const exceptions: Record<string, 'M' | 'F'> = {
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

    if (exceptions[first]) return exceptions[first];

    // 2. Strong Suffix Rules
    if (first.endsWith('A')) return 'F';
    if (first.endsWith('O')) return 'M';

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
    if (first.endsWith('EL') && first !== 'RAQUEL' && first !== 'ISABEL' && first !== 'MABEL') return 'M';

    // Ending in 'OS' -> Male (Marcos, Carlos, Santos)
    if (first.endsWith('OS')) return 'M';

    // Ending in 'US' -> Male (Mateus, Vinicius)
    if (first.endsWith('US')) return 'M';

    // Ending in 'OR' -> Male (Vitor, Igor, Junior)
    if (first.endsWith('OR')) return 'M';

    return 'U';
}


/**
 * Lightweight version of visit counting logic for Dashboards.
 * Uses the 180-minute window rule.
 */
export function calculateVisitCount(records: SaleRecord[]): number {
    if (records.length === 0) return 0;

    // 1. Group by customer first (essential for visit definition)
    const customerSales: Record<string, number[]> = {};
    for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (!r.cliente) continue;
        const name = r.cliente.trim().toUpperCase();
        if (name === "CONSUMIDOR FINAL" || name === "PEDIDO BALCÃO") continue;

        if (!customerSales[name]) customerSales[name] = [];
        customerSales[name].push(r.data.getTime());
    }

    let totalVisits = 0;
    const windowMs = 180 * 60 * 1000;

    const entries = Object.values(customerSales);
    for (let i = 0; i < entries.length; i++) {
        const timestamps = entries[i].sort((a, b) => a - b);
        if (timestamps.length === 0) continue;

        totalVisits++; // Start first visit
        let currentVisitStart = timestamps[0];

        for (let j = 1; j < timestamps.length; j++) {
            if (timestamps[j] - currentVisitStart > windowMs) {
                totalVisits++;
                currentVisitStart = timestamps[j];
            }
        }
    }

    return totalVisits;
}
