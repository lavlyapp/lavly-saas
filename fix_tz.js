const fs = require('fs');

let c = fs.readFileSync('C:/Users/eduar/.gemini/antigravity/scratch/vmpay-saas/app/api/metrics/financial/route.ts', 'utf8');

const regex = /\/\/ Convert boundary strings to ISO boundaries for PostgreSQL[\s\S]*?\/\/ --- 2\. Call Native Database RPC/;

const repl = `// Convert boundary strings to ISO boundaries for PostgreSQL
        function getBrtIsoStart(dateStr) {
            return new Date(\`\${dateStr}T00:00:00-03:00\`).toISOString();
        }
        function getBrtIsoEnd(dateStr) {
            return new Date(\`\${dateStr}T23:59:59.999-03:00\`).toISOString();
        }

        if (period === 'today') {
            queryStartIso = getBrtIsoStart(todayStr);
            queryEndIso = getBrtIsoEnd(todayStr);
        } else if (period === 'yesterday') {
            queryStartIso = getBrtIsoStart(yesterdayStr);
            queryEndIso = getBrtIsoEnd(yesterdayStr);
        } else if (period === 'thisMonth') {
            queryStartIso = getBrtIsoStart(\`\${targetMonthStr}-01\`);
            queryEndIso = getBrtIsoEnd(\`\${targetMonthStr}-\${String(getDaysInMonth(nowBrt)).padStart(2, '0')}\`);
        } else if (period === 'lastMonth') {
            queryStartIso = getBrtIsoStart(\`\${lastMonthStr}-01\`);
            queryEndIso = getBrtIsoEnd(\`\${lastMonthStr}-\${String(getDaysInMonth(new Date(nowBrt.getFullYear(), nowBrt.getMonth() - 1, 1))).padStart(2, '0')}\`);
        } else if (period === 'custom' && startCustom && endCustom) {
            queryStartIso = getBrtIsoStart(startCustom);
            queryEndIso = getBrtIsoEnd(endCustom);
        }

        // --- 2. Call Native Database RPC`;

c = c.replace(regex, repl);
fs.writeFileSync('C:/Users/eduar/.gemini/antigravity/scratch/vmpay-saas/app/api/metrics/financial/route.ts', c);
console.log('Fixed timezone boundaries in route.ts');
