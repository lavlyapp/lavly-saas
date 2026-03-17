# VMPay Data Sync & Reconcilliation Rules

This document serves as the absolute source of truth for handling VMPay data synchronization, timezone aggregations, and local caching anomalies. This was generated after resolving strict reconciliation bugs.

## 1. Timezone Aggregation (The "Midnight Shift" Bug)
VMPay's native analytics group by UTC. However, simply using `date.toISOString().substring(0, 10)` in the browser causes sales after 21:00 BRT to spill over into "Tomorrow".

**The Rule (Strict -3h Offset):**
When grouping transactions by "Today", "Yesterday", or calculating Weekday averages, you **MUST** align the date to physical Brazilian time before extracting strings or day indices.
```javascript
// Correct way to get the true "Today" string for BRT bounding
const nowBrt = new Date(now.getTime() - (3 * 3600 * 1000));
const todayStr = nowBrt.toISOString().substring(0, 10);

// Correct way to match a database record
const rTime = typeof r.data === 'string' ? new Date(r.data).getTime() : r.data.getTime();
const rBrt = new Date(rTime - (3 * 3600 * 1000));
const dbDateStr = rBrt.toISOString().substring(0, 10);
```

## 2. API NextJS Parameters (The "Zero Sales" Bug)
The `api/vmpay/sync/route.ts` expects explicit parameters for manual triggering. If the background sync is disabled (which it currently is to save resources/avoid looping), a manual fetch will silently abort if the wrong query param is sent.

**The Rule:**
Frontend buttons MUST send `manual=true`.
`fetch('/api/vmpay/sync?manual=true&cnpj=...')`

Do not use `source=manual` unless the backend route is explicitly configured to handle it.

## 3. Client-Side Caching (The "Ghost Order" Wipe)
Legacy deduplication scripts that run on page load must never blindly clear `cachedOrders` just because an API model lacks an `id` field.
The Supabase `orders` table intentionally does not send a primary key `id` down to the client under certain nested joins.

**The Rule:**
Do not write "Emergency Deduplication Patches" that clear IndexedDB or React state simply because a field is missing. Trust the initial hydration.
