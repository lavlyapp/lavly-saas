const fs = require('fs');
let c = fs.readFileSync('C:/Users/eduar/.gemini/antigravity/scratch/vmpay-saas/app/api/metrics/financial/route.ts', 'utf8');

const regex = /const \[couponsRes, last30Res\] = await Promise\.all\(\[\s+qCoupons,\s+supabase\.rpc\('get_financial_dashboard_metrics', \{ p_store: store, p_start_date: thirtyDaysAgoIso, p_end_date: now\.toISOString\(\) \}\)\s+\]\);\s+paymentStats\.coupons = couponsRes\.count \|\| 0;\s+let last30DaysAvg = 0;\s+if \(last30Res\.data && last30Res\.data\.salesMetrics\) \{\s+last30DaysAvg = last30Res\.data\.salesMetrics\.totalRevenue \/ 30;\s+\}/;

const repl = `let couponsRes = { count: 0 };
        let last30DaysAvg = 0;
        
        if (period === 'thisMonth' || period === 'today') {
            const [cR, l30] = await Promise.all([
                qCoupons,
                supabase.rpc('get_financial_dashboard_metrics', { p_store: store, p_start_date: thirtyDaysAgoIso, p_end_date: now.toISOString() })
            ]);
            couponsRes = cR;
            if (l30.data && l30.data.salesMetrics) {
                last30DaysAvg = l30.data.salesMetrics.totalRevenue / 30;
            }
        } else {
            const cR = await qCoupons;
            couponsRes = cR;
        }
        
        paymentStats.coupons = couponsRes.count || 0;`;

c = c.replace(regex, repl);
fs.writeFileSync('C:/Users/eduar/.gemini/antigravity/scratch/vmpay-saas/app/api/metrics/financial/route.ts', c);
console.log('RPC Call Optimization done.');
