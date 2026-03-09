require('dotenv').config({ path: '.env.local' });
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: "commonjs" } });

const { syncVMPaySales } = require('./lib/vmpay-client.ts');
const { getVMPayCredentials } = require('./lib/vmpay-config.ts');

async function test() {
    const creds = await getVMPayCredentials();
    const jw = creds.find(c => c.name.includes('JOSE WALTER'));
    if (!jw) {
        console.log('Store not found in config');
        return;
    }

    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 3600 * 1000);

    console.log(`[TEST] Fetching VMPay data for ${jw.name}`);
    console.log(`[TEST] Date range: ${tenDaysAgo.toISOString()} to ${now.toISOString()}`);

    const sales = await syncVMPaySales(tenDaysAgo, now, jw);
    console.log(`[TEST] Result: ${sales.length} sales fetched.`);

    if (sales.length > 0) {
        console.log(`[TEST] Most recent sale date:`, sales[0].data);
    }
}

test().catch(console.error);
