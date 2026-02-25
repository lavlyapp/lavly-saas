import { differenceInMinutes } from "date-fns";

const sales = [
    { data: new Date("2024-01-01T10:00:00Z"), valor: 20 },
    { data: new Date("2024-01-01T10:30:00Z"), valor: 20 },
    { data: new Date("2024-01-01T11:00:00Z"), valor: 20 },
    { data: new Date("2024-01-01T14:00:00Z"), valor: 20 },
    { data: new Date("2024-01-01T15:00:00Z"), valor: 20 },
];

const visitsList: any[] = [];

sales.forEach(r => {
    const lastVisit = visitsList.length > 0 ? visitsList[visitsList.length - 1] : null;

    if (lastVisit && differenceInMinutes(r.data, lastVisit.date) <= 180 && differenceInMinutes(r.data, lastVisit.date) >= 0) {
        lastVisit.items.push(r);
        lastVisit.totalValue += r.valor;
    } else {
        visitsList.push({
            date: r.data,
            items: [r],
            totalValue: r.valor,
        });
    }
});

console.log("Total Visits = ", visitsList.length);
visitsList.forEach((v, i) => {
    console.log(`Visit ${i + 1}: ${v.date.toISOString()} - Items: ${v.items.length}, Value: ${v.totalValue}`);
});
