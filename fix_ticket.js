const fs = require('fs');

let c = fs.readFileSync('C:/Users/eduar/.gemini/antigravity/scratch/vmpay-saas/components/modules/FinancialDashboard.tsx', 'utf8');

c = c.replace(
  /const ticketAverage = useMemo\(\(\) => \{\s+if \(!metrics\) return 0;\s+\/\/ Simple heuristic for tickets matching legacy calculateVisitCount output magnitude\s+const estimatedVisits = Math.max\(1, Math.floor\(metrics.summary.totalSales \* 0.85\)\);\s+return metrics.summary.totalValue \/ estimatedVisits;\s+\}, \[metrics\]\);/,
  `const ticketAverage = useMemo(() => {
        if (!metrics) return 0;
        return metrics.summary.ticketMedio || 0;
    }, [metrics]);`
);

fs.writeFileSync('C:/Users/eduar/.gemini/antigravity/scratch/vmpay-saas/components/modules/FinancialDashboard.tsx', c);
console.log('Fixed average ticket logic.');
