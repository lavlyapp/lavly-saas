import * as fs from 'fs';
import { parseFile } from '../lib/processing/etl';

async function testEtl(filepath: string) {
    const buffer = fs.readFileSync(filepath);
    const filename = filepath.split('/').pop() || filepath.split('\\').pop() || 'test.xlsx';

    // Create a mock File object
    const file = new File([buffer], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    console.log(`[TEST] Parsing ${filename}...`);
    try {
        const result = await parseFile(file);
        console.log("--- RESULT ---");
        console.log(`Type: ${result.type}`);
        console.log(`Errors:`, result.errors);
        console.log(`Logs:`);
        result.logs.forEach(l => console.log('  ' + l));

        console.log(`Parsed Records Count: ${result.records?.length || 0}`);
        if (result.records && result.records.length > 0) {
            console.log("Sample Record[0]:", JSON.stringify(result.records[0], null, 2));
        }

        if (result.type === 'customers' && result.customers) {
            console.log(`Parsed Customers Count: ${result.customers.length}`);
        }
    } catch (e) {
        console.error("ETL Error:", e);
    }
}

const file = process.argv[2] || "C:/Users/eduar/Downloads/Vendas geral desde o começo 2021 a 2026.xlsx";
testEtl(file).catch(console.error);
