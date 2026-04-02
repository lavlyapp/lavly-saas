const fs = require('fs');

let content = fs.readFileSync('C:/Users/eduar/.gemini/antigravity/scratch/vmpay-saas/app/api/metrics/financial/route.ts', 'utf8');

content = content.replace(
  /queryEndIso = \`\$\{targetMonthStr\}-31T23:59:59\.999Z\`/,
  "queryEndIso = `${targetMonthStr}-${String(getDaysInMonth(nowBrt)).padStart(2, '0')}T23:59:59.999Z`"
);

content = content.replace(
  /queryEndIso = \`\$\{lastMonthStr\}-31T23:59:59\.999Z\`/,
  "queryEndIso = `${lastMonthStr}-${String(getDaysInMonth(new Date(nowBrt.getFullYear(), nowBrt.getMonth() - 1, 1))).padStart(2, '0')}T23:59:59.999Z`"
);

fs.writeFileSync('C:/Users/eduar/.gemini/antigravity/scratch/vmpay-saas/app/api/metrics/financial/route.ts', content);
console.log('Fixed');
