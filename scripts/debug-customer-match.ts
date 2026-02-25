import { syncVMPayCustomers, syncVMPaySales } from "../lib/vmpay-client";
import { calculateCrmMetrics } from "../lib/processing/crm";

async function debug() {
    console.log("Fetching Customers...");
    const customers = await syncVMPayCustomers();
    console.log(`Fetched ${customers.length} customers.`);

    // Check gender distribution in raw customer data
    const genderStats = customers.reduce((acc, c) => {
        acc[c.gender || 'U'] = (acc[c.gender || 'U'] || 0) + 1;
        return acc;
    }, {} as any);
    console.log("Raw Customer Gender Stats:", genderStats);

    const sampleCustomer = customers.find(c => c.gender === 'F');
    if (sampleCustomer) {
        console.log("Sample Female Customer:", JSON.stringify(sampleCustomer, null, 2));
    }

    console.log("\nFetching Sales (Last 7 days)...");
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    const sales = await syncVMPaySales(start, end);
    console.log(`Fetched ${sales.length} sales.`);

    // Check one sale
    if (sales.length > 0) {
        console.log("Sample Sale:", JSON.stringify(sales[0], null, 2));
    }

    console.log("\nCalculating Metrics...");
    const metrics = calculateCrmMetrics(sales, customers);

    const profileStats = metrics.profiles.reduce((acc, p) => {
        acc[p.gender || 'U'] = (acc[p.gender || 'U'] || 0) + 1;
        return acc;
    }, {} as any);
    console.log("Enriched Profile Gender Stats:", profileStats);

    // Debug Match Failures
    const undefinedProfiles = metrics.profiles.filter(p => p.gender === 'U');
    console.log(`\nFound ${undefinedProfiles.length} undefined profiles.`);

    if (undefinedProfiles.length > 0) {
        console.log("First 5 Undefined Profiles:");
        undefinedProfiles.slice(0, 5).forEach(p => {
            console.log(`- Name: "${p.name}"`);
            // Try to find in registry manually
            const match = customers.find(c => c.name.trim().toUpperCase() === p.name.trim().toUpperCase());
            console.log(`  -> Registry Match: ${match ? 'YES' : 'NO'}`);
            if (match) {
                console.log(`  -> Registry Gender: ${match.gender}`);
            }
        });
    }
}

debug();
