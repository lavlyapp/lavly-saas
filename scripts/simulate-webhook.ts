/**
 * Simula disparos de Webhook da VMPay para testar localmente a automação do Ar-Condicionado Tuya.
 * Execute com: npx ts-node scripts/simulate-webhook.ts
 */

const WEBHOOK_URL = 'http://localhost:3000/api/vmpay/webhook';

async function simulate(serviceName: string, machine: string) {
    console.log(`\n===========================================`);
    console.log(`➡️ SIMULANDO VENDA: ${serviceName} na ${machine}`);

    // Setando as variáveis de ambiente que o webhook lê localmente
    process.env.STATUS_AUTOMACAO = 'ATIVADO';
    process.env.MINUTOS_LAVAGEM = '5'; // tempo pequeno pra testar rápido
    process.env.MINUTOS_SECAGEM = '10';
    process.env.DEVICE_ID_TUYA = 'TEST_AC_123';

    try {
        const payload = {
            id: `TEST-${Date.now()}`,
            type: "sale",
            serviceName: serviceName,
            machine: machine,
            amount: 15.00,
            timestamp: new Date().toISOString()
        };

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-sim-status': process.env.STATUS_AUTOMACAO || '',
                'x-sim-min-lav': process.env.MINUTOS_LAVAGEM || '',
                'x-sim-min-sec': process.env.MINUTOS_SECAGEM || '',
                'x-sim-device': process.env.DEVICE_ID_TUYA || ''
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log(`⬅️ RESPOSTA [${response.status}]:`, data);

    } catch (e) {
        console.error("Erro na simulação:", e);
    }
}

async function runTests() {
    console.log("Iniciando testes do Webhook VMPay -> Tuya AC\n");

    // 1. Simula uma venda de lavagem (deve adicionar X minutos)
    await simulate("LAVAGEM EXPRESS", "LAVADORA 01");

    // Aguarda um pouco
    await new Promise(r => setTimeout(r, 2000));

    // 2. Simula uma venda de secagem APÓS a lavagem (deve estender o timer, regra da MAIOR DURAÇÃO)
    await simulate("SECAGEM QUENTE", "SECADORA 02");

}

runTests();
