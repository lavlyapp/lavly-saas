
import { differenceInMinutes } from "date-fns";

// Mock Data
const records = [
    { id: '1', data: new Date('2024-01-01T10:00:00'), valor: 18, cliente: 'A' },
    { id: '2', data: new Date('2024-01-01T10:30:00'), valor: 18, cliente: 'A' }, // Should be grouped with 1
    { id: '3', data: new Date('2024-01-01T12:59:00'), valor: 18, cliente: 'A' }, // Should be grouped with 1 (Total 179m diff)
    { id: '4', data: new Date('2024-01-01T13:01:00'), valor: 18, cliente: 'A' }, // Should be NEW visit (>180m from 10:00)

    { id: '5', data: new Date('2024-01-02T10:00:00'), valor: 18, cliente: 'B' },
    { id: '6', data: new Date('2024-01-02T14:00:00'), valor: 18, cliente: 'B' }, // New visit (>180m)
];

function calculate(sales: any[]) {
    sales.sort((a, b) => a.data.getTime() - b.data.getTime());

    const visitsList: any[] = [];

    sales.forEach(r => {
        // Visit Grouping Logic
        const lastVisit = visitsList.length > 0 ? visitsList[visitsList.length - 1] : null;

        // Logic from crm.ts
        if (lastVisit && differenceInMinutes(r.data, lastVisit.date) <= 180 && differenceInMinutes(r.data, lastVisit.date) >= 0) {
            console.log(`Grouping ${r.id} (${r.data.toISOString()}) with Visit starting ${lastVisit.date.toISOString()} (Diff: ${differenceInMinutes(r.data, lastVisit.date)}m)`);
            lastVisit.items.push(r);
            lastVisit.totalValue += r.valor;
        } else {
            console.log(`New Visit for ${r.id} (${r.data.toISOString()})`);
            visitsList.push({
                date: r.data,
                items: [r],
                totalValue: r.valor,
            });
        }
    });

    return visitsList;
}

const visitsA = calculate(records.filter(r => r.cliente === 'A'));
console.log('Visits A:', visitsA.length); // Expect 2
console.log('Items in Visit 1:', visitsA[0].items.length); // Expect 3

const visitsB = calculate(records.filter(r => r.cliente === 'B'));
console.log('Visits B:', visitsB.length); // Expect 2
