import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega as variáveis do .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function setupChatwootBot() {
  const baseUrl = process.env.CHATWOOT_BASE_URL || "https://app.chatwoot.com";
  const apiToken = process.env.CHATWOOT_API_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;
  const webhookUrl = process.env.WEBHOOK_PUBLIC_URL; // Ex: URL do Ngrok (https://xyz.ngrok-free.app/api/chatwoot/webhook)

  if (!apiToken || !accountId || !webhookUrl) {
    console.error("❌ ERRO: Faltam variáveis no .env.local!");
    console.log("Certifique-se de preencher: CHATWOOT_API_TOKEN, CHATWOOT_ACCOUNT_ID e WEBHOOK_PUBLIC_URL");
    return;
  }

  console.log(`🚀 Iniciando criação do Agent Bot no Chatwoot (Conta: ${accountId})...`);

  try {
    // 1. Criar o Agent Bot
    const createBotRes = await fetch(`${baseUrl}/api/v1/accounts/${accountId}/agent_bots`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api_access_token": apiToken
      },
      body: JSON.stringify({
        name: "Lavly IA Assistente",
        description: "Bot automatizado integrado com Gemini",
        outgoing_url: webhookUrl
      })
    });

    if (!createBotRes.ok) {
      const errorText = await createBotRes.text();
      console.error("❌ Falha ao criar bot:", errorText);
      return;
    }

    const botData = await createBotRes.json();
    const botId = botData.id;
    console.log(`✅ Agent Bot criado com sucesso! ID do Bot: ${botId}`);

    // 2. Opcional: Listar caixas de entrada (Inboxes) para conectar
    const inboxesRes = await fetch(`${baseUrl}/api/v1/accounts/${accountId}/inboxes`, {
      headers: { "api_access_token": apiToken }
    });
    
    const inboxesData = await inboxesRes.json();
    const inboxes = inboxesData.payload || [];

    if (inboxes.length === 0) {
      console.log("⚠️ Nenhuma Caixa de Entrada (Inbox) encontrada. Crie a conexão com o WhatsApp primeiro no painel.");
    } else {
      console.log("💡 Para ativar a IA em uma caixa de entrada, rode o comando abaixo na API ou use o painel:");
      inboxes.forEach((inbox: any) => {
        console.log(`   - Inbox: ${inbox.name} | ID: ${inbox.id}`);
      });
      console.log(`\nEndpoint para conectar o bot a um Inbox:`);
      console.log(`POST ${baseUrl}/api/v1/accounts/${accountId}/agent_bots/${botId}/inboxes`);
      console.log(`Body: { "inbox_id": <ID_DA_CAIXA> }`);
    }

  } catch (error) {
    console.error("❌ Erro inesperado:", error);
  }
}

setupChatwootBot();
