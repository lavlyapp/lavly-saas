import { getVMPayCredentials } from '../lib/vmpay-config';
import { syncVMPaySales } from '../lib/vmpay-client';

async function main() {
    console.log("Analyzing VMPay Baskets for Cascavel...");
    const credentials = await getVMPayCredentials();
    const cred = credentials.find(c => c.name.toLowerCase().includes("cascavel"));
    if (!cred) return console.log("Cascavel not found");

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0,0,0,0); // Local time start of day
    
    console.log(`[VMPay API] Fetching from ${startOfDay.toISOString()} to ${now.toISOString()}`);
    const vmpaySales = await syncVMPaySales(startOfDay, now, cred);
    
    let totalBaskets = 0;
    
    vmpaySales.forEach(s => {
        const d = new Date(s.data);
        const brtDate = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const todayBrt = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        
        if (brtDate === todayBrt) {
           console.log(`\nSale ${s.id} - ${s.valor} RS`);
           const items = s.items || [];
           console.log(`Items count: ${items.length}`);
           items.forEach((i: any, idx: number) => {
               console.log(`  Item ${idx + 1}: ${i.machine} | ${i.service} | ${i.value} RS`);
           });
           totalBaskets += items.length;
        }
    });

    console.log(`\nTotal Baskets Found Today (BRT): ${totalBaskets}`);
}

main().catch(console.error);
