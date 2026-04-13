import { CrmSummary, PeriodStats, CustomerProfile, SegmentedCustomer } from './crm';
import { differenceInDays } from 'date-fns';

function inferGender(name: string): 'M' | 'F' | 'U' {
    if (!name) return 'U';
    const normalizedName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const fn = normalizedName.split(' ')[0];
    
    // Very basic fallback if VMPay Database Gender is missing
    if (['LUCA', 'JEAN', 'ANDRE', 'GABRIEL', 'DANIEL', 'MIGUEL', 'SAMUEL', 'RAFAEL', 'EMANUEL', 'MICHEL', 'ARTHUR', 'VICTOR', 'HEITOR', 'IGOR', 'DAVI', 'YURI', 'KAUA', 'KAIO'].includes(fn)) return 'M';
    if (['ALICE', 'RAQUEL', 'ISABEL', 'BEATRIZ', 'CARMEN', 'HELEN', 'KAREN', 'MIRIAN', 'LILIAN', 'ESTER', 'RUTH', 'TAIS', 'LAIS', 'IRIS', 'GLAUCIA', 'SUELI', 'ROSELI', 'SHIRLEI', 'ELIS', 'INARA', 'MARIA', 'ANA', 'JULIA', 'FRANCISCA', 'ANTONIA', 'ALINE', 'SIMONE', 'MICHELE', 'ELAINE', 'VIVIANE', 'GISELE', 'ROSANE', 'CRISTIANE', 'JAQUELINE', 'ELIANE'].includes(fn)) return 'F';
    
    if (fn.endsWith('A') && !['LUCAS', 'JONAS', 'MATIAS', 'MESSIAS'].includes(fn)) return 'F';
    if (fn.endsWith('O')) return 'M';
    
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
            gender: (p.gender && p.gender !== 'U') ? p.gender : inferGender(p.name),
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

export function calculateDemographics(profiles: CustomerProfile[]): any {
    const genderStats: Record<string, number> = { M: 0, F: 0, U: 0 };
    const ageStatsAgg: Record<string, any> = {};
    const maleGroup = { count: 0, totalSpent: 0, totalFreq: 0, totalTicket: 0, washCount: 0, dryCount: 0, churnHigh: 0, churnMedium: 0, churnLow: 0, days: {} as Record<string, number> };
    const femaleGroup = { count: 0, totalSpent: 0, totalFreq: 0, totalTicket: 0, washCount: 0, dryCount: 0, churnHigh: 0, churnMedium: 0, churnLow: 0, days: {} as Record<string, number> };
    let totalAgeSum = 0;
    let totalAgeCount = 0;

    for (let i = 0; i < profiles.length; i++) {
        const p = profiles[i];

        const g = p.gender || 'U';
        genderStats[g] = (genderStats[g] || 0) + 1;

        let range = 'N/A';
        if (p.age) {
            totalAgeSum += p.age;
            totalAgeCount++;
            if (p.age >= 18 && p.age <= 24) range = '18-24';
            else if (p.age >= 25 && p.age <= 34) range = '25-34';
            else if (p.age >= 35 && p.age <= 44) range = '35-44';
            else if (p.age >= 45 && p.age <= 54) range = '45-54';
            else if (p.age >= 55) range = '55+';
        }
        if (!ageStatsAgg[range]) {
            ageStatsAgg[range] = { name: range, count: 0, spent: 0, visits: 0, baskets: 0, males: 0, females: 0, days: {} as Record<string, number> };
        }
        const a = ageStatsAgg[range];
        a.count++;
        a.spent += p.totalSpent;
        a.visits += p.totalVisits;
        a.baskets += (p.totalWashes || 0) + (p.totalDries || 0);
        if (p.gender === 'M') a.males++;
        if (p.gender === 'F') a.females++;
        a.days[p.topDay] = (a.days[p.topDay] || 0) + 1;

        if (p.gender === 'M' || p.gender === 'F') {
            const target = p.gender === 'M' ? maleGroup : femaleGroup;
            target.count++;
            target.totalSpent += p.totalSpent;
            target.totalFreq += p.totalVisits;
            target.totalTicket += p.averageTicket;
            target.washCount += (p.totalWashes || 0);
            target.dryCount += (p.totalDries || 0);
            if (p.churnRisk === 'high') target.churnHigh++;
            else if (p.churnRisk === 'medium') target.churnMedium++;
            else target.churnLow++;
            target.days[p.topDay] = (target.days[p.topDay] || 0) + 1;
        }
    }

    const finalizeGroup = (g: any) => ({
        ...g,
        ticket: g.count > 0 ? g.totalTicket / g.count : 0,
        freq: g.count > 0 ? g.totalFreq / g.count : 0,
        topDay: Object.entries(g.days).sort((a: any, b: any) => (b[1] as number) - (a[1] as number))[0]?.[0] || '-'
    });

    const sortOrder = ['18-24', '25-34', '35-44', '45-54', '55+', 'N/A'];
    const ageStatsArray = sortOrder.map(key => ageStatsAgg[key]).filter(Boolean);
    const ageData = ageStatsArray
        .filter((d: any) => d.name !== 'N/A')
        .map((d: any) => ({ name: d.name, value: d.count }));

    const genderData = [
        { name: 'Masculino', value: genderStats['M'] || 0, color: '#3b82f6' },
        { name: 'Feminino', value: genderStats['F'] || 0, color: '#ec4899' },
        { name: 'Indefinido', value: genderStats['U'] || 0, color: '#525252' },
    ].filter(d => d.value > 0);

    return {
        genderData,
        ageData,
        ageStatsArray,
        maleStats: finalizeGroup(maleGroup),
        femaleStats: finalizeGroup(femaleGroup),
        avgAge: totalAgeCount > 0 ? Math.round(totalAgeSum / totalAgeCount) : 0
    };
}

