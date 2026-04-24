import { Store } from "lucide-react";

interface StoreSelectorProps {
    stores: string[];
    storeOwners?: Record<string, string>;
    selectedStore: string | null;
    onSelectStore: (store: string | null) => void;
}

export function StoreSelector({ stores, storeOwners = {}, selectedStore, onSelectStore }: StoreSelectorProps) {
    if (stores.length === 0) return null;

    const hasGrouping = Object.keys(storeOwners).length > 0;
    let content;

    if (hasGrouping) {
        const groups: Record<string, string[]> = {};
        const unassigned: string[] = [];

        stores.forEach(store => {
            const owner = storeOwners[store];
            if (owner && owner !== 'Outros') {
                if (!groups[owner]) groups[owner] = [];
                groups[owner].push(store);
            } else {
                unassigned.push(store);
            }
        });

        const sortedOwners = Object.keys(groups).sort((a, b) => a.localeCompare(b));

        content = (
            <>
                <option value="">Todas as Lojas</option>
                {sortedOwners.map(owner => (
                    <optgroup key={owner} label={owner}>
                        {groups[owner].sort().map(store => (
                            <option key={store} value={store}>{store}</option>
                        ))}
                    </optgroup>
                ))}
                {unassigned.length > 0 && (
                    <optgroup label="Outros / Sem Dono">
                        {unassigned.sort().map(store => (
                            <option key={store} value={store}>{store}</option>
                        ))}
                    </optgroup>
                )}
            </>
        );
    } else {
        content = (
            <>
                <option value="">Todas as Lojas</option>
                {stores.map((store) => (
                    <option key={store} value={store}>
                        {store}
                    </option>
                ))}
            </>
        );
    }

    return (
        <div className="px-4 py-2">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 block">
                Filtrar por Loja
            </label>
            <div className="relative">
                <select
                    value={selectedStore || ""}
                    onChange={(e) => onSelectStore(e.target.value || null)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm rounded-lg p-2.5 appearance-none focus:ring-emerald-500 focus:border-emerald-500"
                >
                    {content}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-neutral-500">
                    <Store className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}
