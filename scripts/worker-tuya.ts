import { checkAndTurnOffAll } from '../lib/automation/scheduler';

console.log("[Tuya Worker] 🚀 Inicializando Background Worker do Ar-Condicionado...");
console.log("[Tuya Worker] ⏱ Pesquisando banco de dados a cada 10 segundos.\n");

// Executa o check a cada 10 segundos para precisão no desligamento
setInterval(async () => {
    try {
        await checkAndTurnOffAll();
    } catch (e) {
        console.error("[Tuya Worker] Erro no ciclo do worker:", e);
    }
}, 10000);
