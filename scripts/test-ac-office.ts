import * as tuya from '../lib/automation/tuya';

async function main() {
    console.log("=== INICIANDO TESTE DO AR-CONDICIONADO VIA TUYA ===");

    // PREENCHA SUAS CREDENCIAIS AQUI:
    const config = {
        clientId: 'xrcf7xpuvwjkfd5kn48m',
        clientSecret: 'd65cd79efc7f49489664e92a37042afe', // <-- A senha que estava nos scripts antigos
        
        // Se você controla o Ar por um Device ID direto (ex: Tomada Inteligente ou IR Blaster via comando genérico):
        deviceId: 'eb0d7b0b9fa30e5de83kly', // <-- Ar LG Escr liga 2a tcla
        
        // OU se você usa Cenas Inteligentes no App da Tuya (Recomendado para IR):
        sceneOnId: '',
        sceneOffId: ''
    };

    console.log("\n[TESTE 1] Enviando comando para LIGAR o Ar-Condicionado...");
    const turnOnResult = await tuya.setAcState(true, config);
    
    if (turnOnResult) {
        console.log("✅ Sucesso ao LIGAR!");
    } else {
        console.error("❌ Falha ao LIGAR.");
    }

    /* 
    Se quiser testar desligar, descomente as linhas abaixo:
    */
    // console.log("\n[Aguardando 10 segundos antes de desligar...]");
    // await new Promise(r => setTimeout(r, 10000));
    // console.log("\n[TESTE 2] Enviando comando para DESLIGAR o Ar-Condicionado...");
    // const turnOffResult = await tuya.setAcState(false, config);
    // console.log(turnOffResult ? "✅ Sucesso ao DESLIGAR!" : "❌ Falha ao DESLIGAR.");
}

main();
