import { Card } from "@/components/ui/card";
import { SaleRecord } from "@/lib/processing/etl";
import { format, addMinutes, isAfter, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WashingMachine, Wind, Activity, Power, Clock, AlertCircle, Store } from "lucide-react";
import { getCycleDuration } from "@/lib/processing/crm";

interface MachineMonitorProps {
    allRecords: SaleRecord[];  // We need ALL records to find the absolute latest for each machine
    selectedStore: string;
}

interface MachineStatus {
    id: string;
    name: string;
    type: 'washer' | 'dryer';
    lastStartTime: Date;
    endTime: Date;
    isRunning: boolean;
    remainingMinutes: number;
    lastUser: string;
}

export function MachineMonitor({ allRecords, selectedStore }: MachineMonitorProps) {
    if (!allRecords || allRecords.length === 0) return null;

    // Robust check for "All Stores"
    const isAllStores = !selectedStore || selectedStore === 'Todas' || selectedStore === '';

    // If a specific store is selected, ensure it has records
    if (!isAllStores && !allRecords.some(r => r.loja === selectedStore)) return null;

    // 1. Process Data & Calculate Statuses
    const now = new Date();
    const machinesByStore: Record<string, MachineStatus[]> = {};
    const problemMachines: { store: string; machine: string; lastSeen: Date; type: 'washer' | 'dryer' }[] = [];

    let totalWashers = 0;
    let totalDryers = 0;
    let activeWashers = 0;
    let activeDryers = 0;

    const relevantRecords = isAllStores
        ? allRecords
        : allRecords.filter(r => r.loja === selectedStore);

    if (relevantRecords.length === 0) return null;

    // Group records by store directly
    const recordsByStore: Record<string, SaleRecord[]> = {};
    relevantRecords.forEach(r => {
        const storeName = r.loja || 'Loja Desconhecida';
        if (!recordsByStore[storeName]) recordsByStore[storeName] = [];
        recordsByStore[storeName].push(r);
    });

    const runningMachines: { store: string; status: MachineStatus }[] = [];

    Object.entries(recordsByStore).forEach(([store, storeRecords]) => {
        const machineMap = new Map<string, SaleRecord>();

        storeRecords.forEach(record => {
            let machineName = "Desconhecida";
            if (record.items && record.items.length > 0) machineName = record.items[0].machine;
            machineName = machineName.replace(/Maquina\s*/i, 'Máquina ').trim();

            if (machineName === "Desconhecida" && record.produto) {
                const prod = record.produto.toUpperCase();
                const num = prod.match(/\d+/)?.[0];
                if (num) {
                    if (prod.includes('LAV') || prod.includes('33') || prod.includes('30')) machineName = `Máquina ${num}`;
                    else if (prod.includes('SEC') || prod.includes('45')) machineName = `Secadora ${num}`;
                }
            }

            if (machineName === "Desconhecida") return;

            const existing = machineMap.get(machineName);
            if (!existing || record.data > existing.data) {
                machineMap.set(machineName, record);
            }
        });

        const storeMachines: MachineStatus[] = Array.from(machineMap.entries()).map(([name, record]) => {
            const duration = getCycleDuration(record.produto);
            let type: 'washer' | 'dryer';

            // Enhanced Type Detection
            const storeLower = store.toLowerCase();
            const machineNum = parseInt(name.replace(/\D/g, ''), 10);

            if (storeLower.includes('lavateria') && !isNaN(machineNum)) {
                // Lavateria Logic: Even = Washer, Odd = Dryer
                type = machineNum % 2 === 0 ? 'washer' : 'dryer';
            } else {
                // Fallback Logic: Duration Based
                type = duration > 40 ? 'dryer' : 'washer';
            }

            const endTime = addMinutes(record.data, duration);
            const isRunning = isAfter(endTime, now);
            const remaining = isRunning ? differenceInMinutes(endTime, now) : 0;

            // Stats
            if (type === 'washer') {
                totalWashers++;
                if (isRunning) activeWashers++;
            } else {
                totalDryers++;
                if (isRunning) activeDryers++;
            }

            // Problem Detection (>24h inactive)
            if (!isRunning && differenceInMinutes(now, record.data) > 24 * 60) {
                problemMachines.push({
                    store,
                    machine: name,
                    lastSeen: record.data,
                    type
                });
            }

            let displayName = name;
            // Simplify display name logic
            if (name.toLowerCase().includes('máquina')) displayName = name.replace(/Máquina\s*/i, 'MQ ');
            else if (name.toLowerCase().includes('secadora')) displayName = name.replace(/Secadora\s*/i, 'SEC ');

            // If we have a number, ensure it spreads nicely
            if (!isNaN(machineNum)) {
                // displayName = `${type === 'washer' ? 'LAV' : 'SEC'} ${machineNum}`;
                // Actually keep the original name structure but cleaner
                displayName = name.replace(/Máquina/i, '').replace(/Secadora/i, '').trim();
            }

            const status = {
                id: `${store}-${name}`,
                name: displayName || name,
                type,
                lastStartTime: record.data,
                endTime,
                isRunning,
                remainingMinutes: remaining,
                lastUser: record.cliente
            };

            if (isRunning) {
                runningMachines.push({ store, status });
            }

            return status;
        }).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        if (storeMachines.length > 0) {
            machinesByStore[store] = storeMachines;
        }
    });

    const totalMachines = totalWashers + totalDryers;
    const totalActive = activeWashers + activeDryers;
    const activePercentage = totalMachines > 0 ? (totalActive / totalMachines) * 100 : 0;

    return (
        <div className="space-y-6 mt-6">
            {/* Synthetic Summary Bar */}
            <Card className="p-4 bg-neutral-900 border-neutral-800">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-neutral-800 rounded-lg">
                            <Activity className="w-5 h-5 text-[#a3e635]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Visão Geral</h3>
                            <p className="text-sm text-neutral-400">
                                {isAllStores ? 'Todas as Lojas' : selectedStore}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-6 text-sm">
                        <div className="flex flex-col items-center">
                            <span className="text-neutral-500 text-xs uppercase font-bold">Lavadoras</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-white">{activeWashers}</span>
                                <span className="text-neutral-500">/ {totalWashers}</span>
                            </div>
                        </div>
                        <div className="w-px h-8 bg-neutral-800" />
                        <div className="flex flex-col items-center">
                            <span className="text-neutral-500 text-xs uppercase font-bold">Secadoras</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-white">{activeDryers}</span>
                                <span className="text-neutral-500">/ {totalDryers}</span>
                            </div>
                        </div>
                        <div className="w-px h-8 bg-neutral-800" />
                        <div className="flex flex-col items-center">
                            <span className="text-neutral-500 text-xs uppercase font-bold">Em Uso</span>
                            <span className="text-xl font-bold text-[#a3e635]">{activePercentage.toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Running Machines Section (All Stores Only) */}
            {isAllStores && runningMachines.length > 0 && (
                <Card className="p-6 bg-neutral-900 border-neutral-800 border-l-4 border-l-[#a3e635]">
                    <div className="flex items-center gap-2 mb-4 border-b border-neutral-800 pb-2">
                        <Activity className="w-4 h-4 text-[#a3e635] animate-pulse" />
                        <h4 className="font-bold text-white">Máquinas em Uso Agora ({runningMachines.length})</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {runningMachines.map(({ store, status }) => (
                            <div
                                key={`run-${status.id}`}
                                className="relative overflow-hidden rounded-xl border p-4 transition-all duration-300 bg-neutral-900/80 border-[#84cc16]/50 shadow-[0_0_20px_rgba(132,204,22,0.15)]"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-[#84cc16] shadow-[0_0_15px_#84cc16]" />

                                <div className="flex justify-between items-start mb-2 mt-1">
                                    <div className="flex items-center gap-2">
                                        {status.type === 'washer' ? (
                                            <WashingMachine className="w-5 h-5 text-blue-400 animate-pulse" />
                                        ) : (
                                            <Wind className="w-5 h-5 text-orange-400 animate-pulse" />
                                        )}
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm leading-tight text-white">{status.name}</span>
                                            <span className="text-[10px] text-neutral-400 truncate max-w-[100px]">{store}</span>
                                        </div>
                                    </div>
                                    <div
                                        className="w-3 h-3 rounded-full border transition-all duration-500 animate-pulse"
                                        style={{
                                            backgroundColor: '#a3e635',
                                            borderColor: '#bef264',
                                            boxShadow: '0 0 10px 2px rgba(163, 230, 53, 0.8)'
                                        }}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-neutral-500">Restam</span>
                                        <span className="text-white font-mono flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {status.remainingMinutes} min
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Problem Machines Alert */}
            {problemMachines.length > 0 && (
                <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="text-red-400 font-bold text-sm mb-2">Máquinas com possível problema (Inativas +24h)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {problemMachines.map((pm, idx) => (
                                <div key={idx} className="bg-red-950/40 px-3 py-1.5 rounded text-xs text-red-300 border border-red-900/30 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white/90">
                                            {pm.machine}
                                            <span className="text-[10px] ml-1 uppercase opacity-70 bg-red-900/50 px-1 rounded">
                                                {pm.type === 'washer' ? 'LAV' : 'SEC'}
                                            </span>
                                        </span>
                                        <span className="text-[10px] opacity-75 truncate max-w-[150px]">{pm.store}</span>
                                    </div>
                                    <span className="text-[10px] opacity-60 ml-2 whitespace-nowrap font-mono bg-black/20 px-1.5 py-0.5 rounded">
                                        {differenceInMinutes(now, pm.lastSeen) > 48 * 60
                                            ? `${Math.floor(differenceInMinutes(now, pm.lastSeen) / (24 * 60))}d`
                                            : `${Math.floor(differenceInMinutes(now, pm.lastSeen) / 60)}h`
                                        }
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Machine Grids per Store */}
            {Object.entries(machinesByStore).map(([storeName, machines]) => (
                <Card key={storeName} className="p-6 bg-neutral-900 border-neutral-800">
                    <div className="flex items-center gap-2 mb-4 border-b border-neutral-800 pb-2">
                        <Store className="w-4 h-4 text-neutral-500" />
                        <h4 className="font-bold text-white">{storeName}</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {machines.map((machine) => (
                            <div
                                key={machine.id}
                                className={`
                                    relative overflow-hidden rounded-xl border p-4 transition-all duration-300
                                    ${machine.isRunning
                                        ? 'bg-neutral-900/80 border-[#84cc16]/50 shadow-[0_0_20px_rgba(132,204,22,0.15)]'
                                        : 'bg-neutral-950 border-neutral-800 opacity-60'
                                    }
                                `}
                            >
                                {/* Active Indicator Bar */}
                                <div className={`absolute top-0 left-0 w-full h-1 transition-all duration-500 ${machine.isRunning ? 'bg-[#84cc16] shadow-[0_0_15px_#84cc16]' : 'bg-transparent'}`} />

                                <div className="flex justify-between items-start mb-3 mt-1">
                                    <div className="flex items-center gap-2">
                                        {machine.type === 'washer' ? (
                                            <WashingMachine className={`w-5 h-5 ${machine.isRunning ? 'text-blue-400 animate-pulse' : 'text-neutral-600'}`} />
                                        ) : (
                                            <Wind className={`w-5 h-5 ${machine.isRunning ? 'text-orange-400 animate-pulse' : 'text-neutral-600'}`} />
                                        )}
                                        <div className="flex flex-col">
                                            <span className={`font-bold text-sm leading-tight ${machine.isRunning ? 'text-white' : 'text-neutral-500'}`}>
                                                {machine.name}
                                            </span>
                                            <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">
                                                {machine.type === 'washer' ? 'Lavadora' : 'Secadora'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* LED Dot - Neon Lime - Using inline styles for guaranteed visibility */}
                                    <div
                                        className={`w-3 h-3 rounded-full border transition-all duration-500 ${machine.isRunning ? 'animate-pulse' : ''}`}
                                        style={{
                                            backgroundColor: machine.isRunning ? '#a3e635' : '#262626', // lime-400 or neutral-800
                                            borderColor: machine.isRunning ? '#bef264' : '#404040',     // lime-300 or neutral-700
                                            boxShadow: machine.isRunning ? '0 0 10px 2px rgba(163, 230, 53, 0.8)' : 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)'
                                        }}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-neutral-500">Estado</span>
                                        <span className={`font-bold ${machine.isRunning ? 'text-[#a3e635]' : 'text-neutral-500'}`}>
                                            {machine.isRunning ? 'EM USO' : 'LIVRE'}
                                        </span>
                                    </div>

                                    {machine.isRunning && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-neutral-500">Restam</span>
                                            <span className="text-white font-mono flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {machine.remainingMinutes} min
                                            </span>
                                        </div>
                                    )}

                                    <div className="pt-2 mt-2 border-t border-dashed border-neutral-800/50">
                                        <p className="text-[10px] text-neutral-500 truncate" title={machine.lastUser}>
                                            Último: {machine.lastUser.split(' ')[0]}
                                        </p>
                                        <p className="text-[10px] text-neutral-600 font-mono">
                                            {format(machine.lastStartTime, "HH:mm")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            ))}
        </div>
    );
}
