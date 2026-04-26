import { runGlobalSync } from './lib/processing/etl';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log("Starting full rehydration sync (30 days)...");
    try {
        const result = await runGlobalSync();
        console.log("Sync finished!", result);
    } catch (e) {
        console.error("Sync failed:", e);
    }
}

main();
