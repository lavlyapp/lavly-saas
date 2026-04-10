import { CrmSummary, PeriodStats, CustomerProfile, SegmentedCustomer } from './crm';
import { differenceInDays } from 'date-fns';

function inferGender(name: string): 'M' | 'F' | 'U' {
    const fn = name.split(' ')[0].toUpperCase();
    if (fn.endsWith('A') && fn !== 'LUCAS' && fn !== 'JONAS' && fn !== 'MATIAS' && fn !== 'MESSIAS') return 'F';
    if (fn.endsWith('O') || fn.endsWith('R') || fn.endsWith('L') || fn.endsWith('S') || fn.endsWith('N')) return 'M';
    if (['MARIA', 'ANA', 'JULIA', 'FRANCISCA', 'ANTONIA'].includes(fn)) return 'F';
    if (['JOSE', 'JOAO', 'ANTONIO', 'FRANCISCO', 'CARLOS', 'PAULO'].includes(fn)) return 'M';
    return 'U';
}

function calculateChurnRisk(firstDate: Date, lastDate: Date, totalVisits: number, recency: number): 'low' | 'medium' | 'high' {
    const daysSinceFirst = Math.max(differenceInDays(new Date(), firstDate), 1);
    const averageInterval = totalVisits > 1 ? daysSinceFirst / (totalVisits - 1) : 20;

    if (recency > Math.max(averageInterval * 2, 30)) return 'high';
    if (recency > Math.max(averageInterval * 1.5, 15)) return 'medium';
    return 'low';
}

export function rehydrateCrmMetrics(sqlProfiles: any[]): CrmSummary {
    const profiles: CustomerProfile[] = [];
    const today = new Date();

    let washCount = 0;
    let dryCount = 0;
    let totalRevenue = 0;
    let totalVisitsGlobal = 0;

    let active30d = 0;
    let inactive30 = 0;
    let inactive60 = 0;
    let inactive90 = 0;
    let newCustomers = 0;
    let recurring = 0;
    const churnRiskStats = { high: 0, medium: 0, low: 0 };

    sqlProfiles.forEach(p => {
        const firstVisitDate = new Date(p.first_visit);
        const lastVisitDate = new Date(p.last_visit);
        const recency = differenceInDays(today, lastVisitDate);
        const daysSinceFirst = Math.max(differenceInDays(today, firstVisitDate), 1);

        const wCount = Number(p.w_count) || 0;
        const dCount = Number(p.d_count) || 0;
        const visits = Number(p.total_visits) || 0;
        const totalCycles = wCount + dCount;
        const spent = Number(p.total_spent) || 0;

        washCount += wCount;
        dryCount += dCount;
        totalRevenue += spent;
        totalVisitsGlobal += visits;

        const churnRisk = calculateChurnRisk(firstVisitDate, lastVisitDate, visits, recency);
        churnRiskStats[churnRisk]++;

        if (recency <= 30) active30d++;
        else if (recency > 30 && recency <= 60) inactive30++;
        else if (recency > 60 && recency <= 90) inactive60++;
        else inactive90++;

        if (daysSinceFirst <= 30) newCustomers++;
        if (visits > 1) recurring++;

        profiles.push({
            name: p.name,
            totalSpent: spent,
            totalBaskets: totalCycles,
            totalVisits: visits,
            avgBasketsPerVisit: visits > 0 ? totalCycles / visits : 0,
            lastVisitDate,
            recency,
            spent30d: 0, 
            spent90d: 0,
            topDay: 'N/A', // Omitido neste patch do Backend Edge para poupar CPU
            topShift: 'N/A',
            firstVisitDate,
            phone: p.phone || '',
            email: undefined,
            cpf: undefined,
            registrationDate: undefined,
            spent180d: 0,
            baskets180d: 0,
            topSlots: [],
            averageTicket: visits > 0 ? spent / visits : 0,
            totalWashes: wCount,
            totalDries: dCount,
            totalCycles,
            lastVisits: [],
            averageInterval: visits > 1 ? daysSinceFirst / (visits - 1) : 20,
            churnRisk,
            nextPredictedVisit: new Date(lastVisitDate.getTime() + (visits > 1 ? daysSinceFirst / (visits - 1) : 20) * 86400000),
            age: undefined,
            birthDate: undefined,
            gender: inferGender(p.name),
            preferredStore: 'Todas'
        });
    });

    profiles.sort((a, b) => b.totalSpent - a.totalSpent);

    const totalUniqueCustomers = profiles.length;
    const totalCyclesGlobal = washCount + dryCount;

    return {
        profiles,
        globalAvgBasketsPerVisit: totalVisitsGlobal > 0 ? totalCyclesGlobal / totalVisitsGlobal : 0,
        globalAverageTicket: totalVisitsGlobal > 0 ? totalRevenue / totalVisitsGlobal : 0,
        totalUniqueCustomers,
        totalCycles: totalCyclesGlobal,
        totalRevenue,
        totalVisits: totalVisitsGlobal,
        totalBaskets: totalCyclesGlobal,
        activeCustomers: active30d, 
        churnRate: totalUniqueCustomers > 0 ? (inactive90 / totalUniqueCustomers) : 0,
        washDryStats: {
            washCount,
            dryCount,
            ratio: washCount > 0 ? dryCount / washCount : 0,
            totalBaskets: totalCyclesGlobal,
            conversionRate: washCount > 0 ? (dryCount / washCount) * 100 : 0
        },
        customerStats: {
            active30d,
            newCustomers,
            recurring,
            inactive30,
            inactive60,
            inactive90,
            churnRiskStats,
            avgTypeFrequency: 0,
            avgLtv: totalUniqueCustomers > 0 ? totalRevenue / totalUniqueCustomers : 0,
            retentionRate: totalUniqueCustomers > 0 ? recurring / totalUniqueCustomers : 0,
            churnRate: totalUniqueCustomers > 0 ? (inactive90 / totalUniqueCustomers) : 0
        }
    };
}

export function rehydratePeriodStats(sqlProfiles: any[]): PeriodStats {
    let onlyWashCount = 0;
    let onlyDryCount = 0;
    let washAndDryCount = 0;

    const onlyWashList: SegmentedCustomer[] = [];
    const onlyDryList: SegmentedCustomer[] = [];
    const washAndDryList: SegmentedCustomer[] = [];
    
    let totalRevenue = 0;
    let totalVisits = 0;
    
    sqlProfiles.forEach(p => {
        const wCount = Number(p.w_count) || 0;
        const dCount = Number(p.d_count) || 0;
        const spent = Number(p.total_spent) || 0;
        const visits = Number(p.total_visits) || 0;

        totalRevenue += spent;
        totalVisits += visits;

        const customer: SegmentedCustomer = {
            name: p.name,
            phone: p.phone,
            wCount,
            dCount,
            totalSpent: spent,
            lastVisit: new Date(p.last_visit),
        };

        if (wCount > 0 && dCount === 0) {
            onlyWashCount++;
            onlyWashList.push(customer);
        } else if (dCount > 0 && wCount === 0) {
            onlyDryCount++;
            onlyDryList.push(customer);
        } else if (wCount > 0 && dCount > 0) {
            washAndDryCount++;
            washAndDryList.push(customer);
        }
    });

    const activeCustomers = sqlProfiles.length;

    return {
        activeCustomers,
        newCustomers: 0, 
        newCustomersList: [],
        onlyWashCount,
        onlyDryCount,
        washAndDryCount,
        washAndDryBalancedCount: 0,
        onlyWashList,
        onlyDryList,
        washAndDryList,
        unclassifiedList: [],
        totalRevenue,
        totalVisits,
        avgTicket: totalVisits > 0 ? totalRevenue / totalVisits : 0,
        avgLtv: activeCustomers > 0 ? totalRevenue / activeCustomers : 0,
    };
}
