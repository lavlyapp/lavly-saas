import { SaleRecord } from "./etl";
import { addMinutes, getDay, getHours, getMinutes, startOfDay, endOfDay, format } from "date-fns";

export interface MachineUsage {
    machineId: string;
    type: 'wash' | 'dry';
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
}

export interface AvailabilityMetrics {
    totalMachines: { wash: number, dry: number };
    saturationByHour: { day: number, hour: number, saturation: number, count: number }[]; // 0-1 saturation
    peakHours: { day: string, hour: string, saturation: number, type: 'wash' | 'dry' | 'all' }[];
    recommendations: string[];
    expansionROI?: {
        monthlyRevenueIncrease: number;
        capturedCyclesPerMonth: number;
        estimatedPaybackMonths: number;
        capacityIncreasePercentage: number;
        avgTicket: number;
    };
}

const WASH_DURATION = 33.5;
const DRY_DURATION = 49;

export interface FlexibleCustomer {
    name: string;
    phone: string;
    totalVisits: number;
    peakVisits: number;
    offPeakVisits: number;
    preferredPeakHour: string;
    preferredPeakDay: string;
    preferredOffPeakHour: string;
    preferredOffPeakDay: string;
    potentialSavingsPercentage: number;
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function findFlexibleCustomers(records: SaleRecord[], saturationByHour: AvailabilityMetrics['saturationByHour']): FlexibleCustomer[] {
    const customerMap = new Map<string, {
        name: string;
        phone: string;
        visits: { d: number, h: number, isPeak: boolean }[];
    }>();

    records.forEach(r => {
        const d = getDay(r.data);
        const h = getHours(r.data);
        const stat = saturationByHour.find(s => s.day === d && s.hour === h);
        const isPeak = (stat?.saturation || 0) > 0.6; // High or Critical

        const existing = customerMap.get(r.cliente) || { name: r.cliente, phone: r.telefone || '', visits: [] };
        existing.visits.push({ d, h, isPeak });
        customerMap.set(r.cliente, existing);
    });

    return Array.from(customerMap.values())
        .filter(c => {
            const peakCount = c.visits.filter(v => v.isPeak).length;
            const offPeakCount = c.visits.filter(v => !v.isPeak).length;
            return peakCount > 0 && offPeakCount > 0;
        })
        .map(c => {
            const peakVisits = c.visits.filter(v => v.isPeak);
            const offPeakVisits = c.visits.filter(v => !v.isPeak);

            const findModes = (visits: { d: number, h: number }[]) => {
                const hourMap = new Map<number, number>();
                const dayMap = new Map<number, number>();
                visits.forEach(v => {
                    hourMap.set(v.h, (hourMap.get(v.h) || 0) + 1);
                    dayMap.set(v.d, (dayMap.get(v.d) || 0) + 1);
                });
                const h = Array.from(hourMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
                const d = Array.from(dayMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
                return { h, d };
            };

            const peakMode = findModes(peakVisits);
            const offPeakMode = findModes(offPeakVisits);

            return {
                name: c.name,
                phone: c.phone,
                totalVisits: c.visits.length,
                peakVisits: peakVisits.length,
                offPeakVisits: offPeakVisits.length,
                preferredPeakHour: `${peakMode.h}h`,
                preferredPeakDay: DAY_LABELS[peakMode.d],
                preferredOffPeakHour: `${offPeakMode.h}h`,
                preferredOffPeakDay: DAY_LABELS[offPeakMode.d],
                potentialSavingsPercentage: 15
            };
        })
        .sort((a, b) => b.peakVisits - a.peakVisits)
        .slice(0, 15);
}

export function calculateMachineAvailability(records: SaleRecord[]): AvailabilityMetrics {
    const usages: MachineUsage[] = [];
    const uniqueWashMachines = new Set<string>();
    const uniqueDryMachines = new Set<string>();

    records.forEach(r => {
        if (r.items && r.items.length > 0) {
            r.items.forEach(item => {
                const machineId = item.machine;
                const service = (item.service || '').toLowerCase();
                const mName = (item.machine || '').toLowerCase();

                let type: 'wash' | 'dry' = 'wash';
                let duration = WASH_DURATION;

                if (service.includes('sec') || mName.includes('sec')) {
                    type = 'dry';
                    duration = DRY_DURATION;
                    uniqueDryMachines.add(machineId);
                } else {
                    uniqueWashMachines.add(machineId);
                }

                if (machineId) {
                    usages.push({
                        machineId,
                        type,
                        startTime: r.data,
                        endTime: addMinutes(r.data, duration),
                        durationMinutes: duration
                    });
                }
            });
        }
    });

    const daysCount = new Array(7).fill(0);
    const uniqueDates = new Set<string>();

    records.forEach(r => {
        const dateStr = format(r.data, 'yyyy-MM-dd');
        if (!uniqueDates.has(dateStr)) {
            uniqueDates.add(dateStr);
            const d = getDay(r.data);
            daysCount[d]++;
        }
    });

    const totalWash = Math.max(uniqueWashMachines.size, 1);
    const totalDry = Math.max(uniqueDryMachines.size, 1);

    const washTimeline = new Int16Array(7 * 24 * 60);
    const dryTimeline = new Int16Array(7 * 24 * 60);

    usages.forEach(u => {
        let current = new Date(u.startTime);
        const endMs = u.endTime.getTime();
        const timeline = u.type === 'wash' ? washTimeline : dryTimeline;

        while (current.getTime() < endMs) {
            const d = getDay(current);
            const h = getHours(current);
            const m = getMinutes(current);

            const index = (d * 24 * 60) + (h * 60) + m;
            if (index < timeline.length) {
                timeline[index]++;
            }

            current = addMinutes(current, 1);
        }
    });

    const saturationByHour: { day: number, hour: number, saturation: number, count: number }[] = [];

    for (let d = 0; d < 7; d++) {
        const numDays = Math.max(daysCount[d], 1);

        for (let h = 0; h < 24; h++) {
            let maxWashInHour = 0;
            let maxDryInHour = 0;

            for (let m = 0; m < 60; m++) {
                const index = (d * 24 * 60) + (h * 60) + m;
                const wc = washTimeline[index];
                const dc = dryTimeline[index];
                if (wc > maxWashInHour) maxWashInHour = wc;
                if (dc > maxDryInHour) maxDryInHour = dc;
            }

            const avgWash = maxWashInHour / numDays;
            const avgDry = maxDryInHour / numDays;

            const washSat = avgWash / totalWash;
            const drySat = avgDry / totalDry;

            // Bottleneck saturation: it's the highest load between wash or dry
            const saturation = Math.max(washSat, drySat);

            saturationByHour.push({
                day: d,
                hour: h,
                saturation,
                count: Math.round(avgWash + avgDry)
            });
        }
    }

    const recommendations: string[] = [];
    const peakHours = saturationByHour
        .filter(s => s.saturation > 0.7)
        .map(s => ({
            day: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][s.day],
            hour: `${s.hour}h`,
            saturation: s.saturation,
            type: 'all' as const
        }))
        .sort((a, b) => b.saturation - a.saturation);

    if (peakHours.length > 5) {
        recommendations.push(`Alta demanda detectada em ${peakHours.length} horários. Considere promoções em horários de vale.`);
    }

    if (peakHours.some(p => p.saturation >= 1.0)) {
        recommendations.push("Identificamos momentos de lotoção máxima (Fila de espera). Potencial perda de clientes.");
    }

    // 4. Calculate Expansion ROI (Expansion Study)
    // Identify hours where demand > capacity (Latent Demand)
    // Formula: Cycles captured by 1 additional set (1W + 1D) during peaks
    let latentCyclesPerMonth = 0;
    let totalRevenueInRange = 0;
    let totalCyclesInRange = 0;

    records.forEach(r => {
        r.items?.forEach(i => {
            totalRevenueInRange += (i.value || 0);
            totalCyclesInRange++;
        });
    });

    const avgTicket = totalCyclesInRange > 0 ? totalRevenueInRange / totalCyclesInRange : 35; // Default fallback R$ 35

    // Check saturation data to estimate lost cycles
    saturationByHour.forEach(s => {
        // If saturation > 75%, assume demand higher than capacity.
        if (s.saturation > 0.75) {
            latentCyclesPerMonth += (1 * 4); // 1 extra cycle per hour * 4 weeks
        }
    });

    const monthlyRevenueIncrease = latentCyclesPerMonth * avgTicket;
    const MACHINE_SET_COST = 35000; // Average cost for 1 tower (W+D)

    const expansionROI = {
        monthlyRevenueIncrease,
        capturedCyclesPerMonth: latentCyclesPerMonth,
        estimatedPaybackMonths: monthlyRevenueIncrease > 0 ? MACHINE_SET_COST / monthlyRevenueIncrease : 0,
        capacityIncreasePercentage: ((totalWash + totalDry + 2) / (totalWash + totalDry) - 1) * 100,
        avgTicket
    };

    return {
        totalMachines: { wash: totalWash, dry: totalDry },
        saturationByHour,
        peakHours: peakHours.slice(0, 5),
        recommendations,
        expansionROI
    };
}
