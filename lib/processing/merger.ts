import { OrderRecord } from "./etl";

/**
 * Merges new orders into an existing list of orders using a "Fuzzy Time" strategy.
 * This is crucial because API timestamps and Excel timestamps often differ by a few minutes
 * or seconds, causing duplication if we rely on strict equality.
 * 
 * Strategy:
 * 1. Iterate through new orders.
 * 2. For each new order, check if a "Similar Order" already exists in the current list.
 * 3. Similarity Criteria:
 *    - Same Machine
 *    - Same Value (allowing small float diffs)
 *    - Time within defined threshold (e.g., 5 minutes)
 *    - (Optional) Same Service type if available in both
 * 4. If match found: 
 *    - If the new order has "better" data (e.g., comes from Excel with status), update the existing one.
 *    - Otherwise, ignore the new order (it's a duplicate).
 * 5. If no match found: Add as new order.
 */
export function mergeOrders(currentOrders: OrderRecord[], newOrders: OrderRecord[]): OrderRecord[] {
    const TIME_THRESHOLD_MS = 5 * 60 * 1000; // 5 Minutes
    let addedCount = 0;
    let updatedCount = 0;

    // 1. Index Existing Orders by Date + Machine ID for O(1) lookup and narrow candidate pools
    const existingMap = new Map<string, { order: OrderRecord, index: number }[]>();

    const getMapKey = (order: OrderRecord) => {
        const m = String(order.machine || '').trim().replace(/^0+/, '');
        const d = order.data && !isNaN(order.data.getTime()) ? order.data.toISOString().split('T')[0] : 'nodate';
        return `${d}_${m}`;
    };

    currentOrders.forEach((order, index) => {
        const key = getMapKey(order);
        if (!existingMap.has(key)) {
            existingMap.set(key, []);
        }
        existingMap.get(key)!.push({ order, index });
    });

    // Create a copy to mutate
    const MERGED = [...currentOrders];

    // Helper for similarity check
    const isSameOrder = (exist: OrderRecord, target: OrderRecord) => {
        // Machine and Date are already matched by Map key roughly
        // Check Value
        if (Math.abs((exist.valor || 0) - (target.valor || 0)) > 0.05) return false;
        // Check Time strictly (5 minutes)
        if (!exist.data || !target.data) return false;
        const timeDiff = Math.abs(exist.data.getTime() - target.data.getTime());
        if (timeDiff > TIME_THRESHOLD_MS) return false;
        return true;
    };

    newOrders.forEach(newOrder => {
        const key = getMapKey(newOrder);
        const candidates = existingMap.get(key);

        let matchFound = false;
        let matchIndex = -1;

        if (candidates) {
            for (const candidate of candidates) {
                if (isSameOrder(candidate.order, newOrder)) {
                    matchFound = true;
                    matchIndex = candidate.index;
                    break;
                }
            }
        }

        if (matchFound && matchIndex !== -1) {
            // Update logic
            const existing = MERGED[matchIndex];
            let shouldUpdate = false;

            if ((!existing.status || existing.status === 'Unknown') && (newOrder.status && newOrder.status !== 'Unknown')) {
                shouldUpdate = true;
            }
            if ((!existing.service || existing.service === 'Unknown') && newOrder.service) {
                shouldUpdate = true;
            }

            if (shouldUpdate) {
                const updatedOrder = {
                    ...existing,
                    ...newOrder
                };

                // PRESERVE CRITICAL DATA 
                // If new order (e.g. from API) misses birthDate but existing (from File) has it, keep it.
                if (!newOrder.birthDate && existing.birthDate) {
                    updatedOrder.birthDate = existing.birthDate;
                    updatedOrder.age = existing.age;
                }

                // Preserve original row ref if exists
                if (!newOrder.originalRow && existing.originalRow) {
                    updatedOrder.originalRow = existing.originalRow;
                }

                MERGED[matchIndex] = updatedOrder;
                updatedCount++;
            }
        } else {
            // New Order
            MERGED.push(newOrder);
            // Optionally update map if we want to catch duplicates WITHIN the new batch?
            // If new batch has duplicates, we might want to handle that too.
            // For now, assuming batch internal uniqueness is handled or acceptable.
            // To handle batch duplicates, we would add to Map here.

            // Add to map to prevent double addition if newOrders itself has duplicates
            if (!existingMap.has(key)) existingMap.set(key, []);
            existingMap.get(key)!.push({ order: newOrder, index: MERGED.length - 1 });

            addedCount++;
        }
    });

    console.log(`[MergeOrders] Input: ${currentOrders.length} existing, ${newOrders.length} new.`);
    console.log(`[MergeOrders] Result: ${addedCount} added, ${updatedCount} updated.`);

    return MERGED;
}
