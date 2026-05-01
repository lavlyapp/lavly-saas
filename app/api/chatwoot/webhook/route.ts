import { NextResponse } from 'next/server';
import { ChatwootClient } from '../../../../lib/chatwoot/client';
import { processUserMessageWithAI } from '../../../../lib/ai/gemini-agent';

// Recebe os eventos disparados pelo Chatwoot
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verificamos se o evento é de criação de mensagem
    if (body.event !== 'message_created') {
      return new NextResponse('Ignorado', { status: 200 });
    }

    // Só respondemos mensagens que vieram de clientes reais (tipo "incoming")
    if (body.message_type !== 'incoming') {
      return new NextResponse('Mensagem enviada pelo atendente/bot, ignorada', { status: 200 });
    }

    const conversationId = body.conversation?.id;
    const conversationStatus = body.conversation?.status;
    const userText = body.content;
    const phone = body.sender?.phone_number || body.sender?.identifier || "unknown";

    // Regra de Ouro: Só o Bot responde se a conversa estiver no status "bot" ou "pending"
    // Se um humano mudou para "open" e está atendendo, o bot fica calado para não atrapalhar
    if (conversationStatus === 'open') {
      console.log(`[Chatwoot Webhook] Conversa ${conversationId} está aberta com humano. Bot ignorando.`);
      return new NextResponse('Conversa em handoff', { status: 200 });
    }

    if (!conversationId || !userText) {
      return new NextResponse('Dados insuficientes', { status: 400 });
    }

    console.log(`[Chatwoot] Mensagem recebida na conversa ${conversationId}: ${userText}`);

    const chatwoot = new ChatwootClient();
    const storeId = "default"; // Lógica futura: inferir loja baseado no inbox_id do Chatwoot

    // 1. Processa com a IA
    const aiResponse = await processUserMessageWithAI(phone, userText, storeId);

    // 2. Verifica se a IA decidiu fazer Handoff (passar para um humano)
    // O nosso System Prompt instruiu a IA a dizer uma frase chave caso precise de ajuda humana
    const isHandoffRequested = aiResponse.toLowerCase().includes("transferir") && aiResponse.toLowerCase().includes("humano");

    if (isHandoffRequested) {
      // Avisamos o cliente final
      await chatwoot.sendMessage(conversationId, aiResponse);
      
      // Transferimos para o time humano no Chatwoot (a notificação apita no celular deles agora!)
      await chatwoot.handoffToHuman(
        conversationId, 
        `🤖 **Alerta da IA:** Tentei ajudar, mas identifiquei que este caso precisa de um humano. O último pedido foi: "${userText}"`
      );
      
      return new NextResponse('Handoff realizado', { status: 200 });
    }

    // 3. Humanização: Chunking e Delays
    let chunks = aiResponse
      .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
      .split("|")
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (chunks.length === 0) chunks = [aiResponse];
    if (chunks.length > 3) {
      chunks = [chunks[0], chunks.slice(1, -1).join(' '), chunks[chunks.length - 1]];
    }

    // 4. Envia as respostas fatiadas via Chatwoot
    // OBS: Como não temos controle direto do socket para enviar "Digitando..." via Chatwoot Bot de forma simples,
    // o delay no envio das mensagens em série já faz esse papel de compasso humano.
    for (const chunk of chunks) {
      const typingDelay = Math.min(Math.max(chunk.length * 50, 1500), 4000);
      await new Promise(resolve => setTimeout(resolve, typingDelay));
      
      await chatwoot.sendMessage(conversationId, chunk);
    }

    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('[Chatwoot Webhook Error]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
