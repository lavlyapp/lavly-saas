import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';
import { processUserMessageWithAI } from '../lib/ai/gemini-agent';

// Carrega as variáveis do .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const PHONE = "terminal_user_123";
const STORE_ID = "default"; // Trocando isso testamos outras lojas do nosso config

console.log("=========================================");
console.log("🤖 SIMULADOR DO AGENTE LAVLY (Via Terminal)");
console.log(`Loja simulada: ${STORE_ID}`);
console.log("Digite 'sair' para encerrar a simulação.");
console.log("=========================================\n");

async function askQuestion() {
  rl.question('\nVocê: ', async (text) => {
    if (text.toLowerCase() === 'sair' || text.toLowerCase() === 'exit') {
      console.log("Encerrando simulador...");
      rl.close();
      return;
    }

    try {
      // Exibe "Digitando..." enquanto espera a IA
      process.stdout.write('IA: Digitando...');
      
      const response = await processUserMessageWithAI(PHONE, text, STORE_ID);
      
      // Limpa a linha do "Digitando..."
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      
      console.log(`IA: ${response}`);
      
      if (response.toLowerCase().includes("transferir") && response.toLowerCase().includes("humano")) {
        console.log("\n[⚠️ NOTA DE SISTEMA: O Bot solicitou Handoff para o Humano aqui!]");
      }
      
    } catch (error: any) {
       readline.clearLine(process.stdout, 0);
       readline.cursorTo(process.stdout, 0);
       console.error(`❌ Erro na IA: ${error.message}`);
    }

    askQuestion();
  });
}

askQuestion();
