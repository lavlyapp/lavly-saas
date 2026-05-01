export async function sendWhatsAppMessage(phone: string, text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneNumberId) {
    console.warn("⚠️ WHATSAPP_TOKEN ou WHATSAPP_PHONE_ID ausentes no .env");
    return;
  }

  // A API Cloud do WhatsApp espera o número formatado sem o '+' e com o DDI (ex: 5511999999999)
  const cleanPhone = phone.replace(/\D/g, '');

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'text',
    text: { preview_url: false, body: text }
  };

  const response = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();
  if (!response.ok) {
    console.error("[WhatsApp API Error]", data);
    throw new Error(`Falha ao enviar mensagem via WhatsApp API: ${data.error?.message}`);
  }

  return data;
}

export async function markMessageAsRead(messageId: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneNumberId) return;

  await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      })
    }
  );
}
