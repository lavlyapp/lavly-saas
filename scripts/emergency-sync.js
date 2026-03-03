
require('dotenv').config({ path: '.env.local' });
const { runGlobalSync } = require('./lib/automation/sync-manager');

async function testSync() {
    console.log("🚀 Starting emergency global sync test...");
    try {
        await runGlobalSync();
        console.log("✅ Sync completed (check logs for details)");
    } catch (err) {
        console.error("❌ Sync failed:", err);
    }
}

testSync();
