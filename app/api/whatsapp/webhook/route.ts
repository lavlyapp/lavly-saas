import { NextResponse } from 'next/server';
import { sendWhatsAppMessage, markMessageAsRead } from '../../../../lib/whatsapp/cloud-api';
import { processUserMessageWithAI } from '../../../../lib/ai/gemini-agent';

// Validação do Webhook (Exigência da Meta/WhatsApp)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Verificado com sucesso!');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// Recebimento de Mensagens
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validar se é um evento do WhatsApp
    if (body.object !== 'whatsapp_business_account') {
      return new NextResponse('Not Found', { status: 404 });
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    // Se for uma mensagem (ignora status de envio/leitura que vêm no mesmo webhook)
    if (value?.messages && value?.messages.length > 0) {
      const message = value.messages[0];
      const phone = message.from; // Número de quem enviou
      const messageId = message.id;

      if (message.type === 'text') {
        const userText = message.text.body;
        console.log(`[WhatsApp] Mensagem recebida de ${phone}: ${userText}`);

        // 1. Marca como lida para dar feedback visual de que o bot "viu"
        await markMessageAsRead(messageId).catch(e => console.error("Erro ao marcar como lida:", e));

        // Aqui, poderíamos buscar no banco (Supabase) qual a loja que esse cliente frequenta
        // Para fins do exemplo, usaremos a loja "default"
        const storeId = "default";

        // 2. Processa com a IA
        const aiResponse = await processUserMessageWithAI(phone, userText, storeId);

        // 3. Humanização: Chunking e Delays
        // Quebra a resposta da IA por ponto final, exclamação ou interrogação, seguido de espaço
        // Evitamos quebrar dentro de decimais (ex: R$ 18.00) usando lookbehind simples ou split manual
        let chunks = aiResponse
          .replace(/([.?!])\s*(?=[A-Z])/g, "$1|") // Coloca um pipe | depois da pontuação que precede letra maiúscula
          .split("|")
          .map(c => c.trim())
          .filter(c => c.length > 0);

        // Se por acaso a regex falhar e não quebrar, o fallback é mandar o texto inteiro
        if (chunks.length === 0) chunks = [aiResponse];

        // Se tiver mais que 3 chunks, junta os menores para não enviar 10 mensagens curtas demais
        if (chunks.length > 3) {
          chunks = [
            chunks[0],
            chunks.slice(1, -1).join(' '),
            chunks[chunks.length - 1]
          ];
        }

        // 4. Envia os balões de mensagem
        for (const chunk of chunks) {
          // Delay de digitação baseado no tamanho do texto (simula 50ms por caractere, mínimo 1.5s, máximo 4s)
          const typingDelay = Math.min(Math.max(chunk.length * 50, 1500), 4000);
          
          // Na API Oficial, mandar "typing_on" é feito por um endpoint específico, mas um delay simples
          // no envio das mensagens em série já causa um efeito visual muito mais realista de "espera"
          await new Promise(resolve => setTimeout(resolve, typingDelay));
          
          await sendWhatsAppMessage(phone, chunk);
        }
      }
    }

    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('[WhatsApp Webhook Error]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
