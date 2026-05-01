import { GoogleGenAI } from '@google/genai';
import { storesConfig } from '../../config/stores';

// Memória de curto prazo para as conversas (idealmente deveria ir para Redis/BD em produção escalável)
const conversationMemory = new Map<string, { role: string, parts: { text: string }[] }[]>();

export async function processUserMessageWithAI(phone: string, text: string, storeId: string = "default"): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no .env");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Buscar regras da loja
  const storeRules = storesConfig[storeId] || storesConfig["default"];

  const SYSTEM_PROMPT = `Você é o assistente virtual super educado e humano da lavanderia ${storeRules.name}.
Sua missão é ajudar os clientes a lavar e secar roupas, responder dúvidas financeiras e fornecer suporte rápido.

INFORMAÇÕES CRÍTICAS DA LOJA ATUAL:
- Endereço: ${storeRules.address}
- Horário: ${storeRules.business_hours}
- Preço Lavagem: R$ ${storeRules.pricing.wash_price.toFixed(2)} (Duração: ${storeRules.pricing.wash_duration_minutes} min)
- Preço Secagem: R$ ${storeRules.pricing.dry_price.toFixed(2)} (Duração: ${storeRules.pricing.dry_duration_minutes} min)

REGRAS:
${storeRules.rules.map(r => "- " + r).join('\n')}

PROMOÇÕES ATIVAS:
${storeRules.promotions.map(p => "- " + p).join('\n')}

DIRETRIZES DE HUMANIZAÇÃO (MUITO IMPORTANTE):
1. SEJA CONCISO. Mensagens curtas, parecendo um humano digitando rápido.
2. NUNCA use formatação pesada (NUNCA use **negrito** ou listas com traços pesados). Se for listar algo, use texto fluido.
3. Se o cliente relatar um erro grave na máquina (ex: travou com roupa dentro) ou problema de estorno que você não pode resolver, diga: "Entendi o problema. Vou transferir você para um atendente humano da nossa equipe técnica para resolvermos isso na hora, ok?" e pare de responder o fluxo atual.
4. Jamais invente preços, promoções ou capacidades diferentes do que está listado acima.
5. Use um tom caloroso, amigável, ocasionalmente usando emojis 😊, mas sem exagero.`;

  // Get history
  let history = conversationMemory.get(phone) || [];
  history.push({ role: 'user', parts: [{ text }] });
  
  // Limitar histórico para não estourar tokens e contexto (manter últimas 15 interações)
  if (history.length > 15) history = history.slice(history.length - 15);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: history,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7 // Tom equilibrado
      }
    });

    const replyText = response.text || "Poxa, desculpe, deu um errinho interno aqui. Pode repetir?";

    // Save assistant reply
    history.push({ role: 'model', parts: [{ text: replyText }] });
    conversationMemory.set(phone, history);

    return replyText;
  } catch (error) {
    console.error("[Gemini API Error]", error);
    throw error;
  }
}
