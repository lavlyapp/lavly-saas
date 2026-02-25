
/**
 * WhatsApp Utility with Safety Lock
 * 
 * When SAFETY_LOCK_ENABLED is true, all messages are redirected to the SAFETY_LOCK_NUMBER.
 * The original recipient's number is requested prepended to the message body for verification.
 */

export const SAFETY_LOCK_ENABLED = true;
// User provided test number: +55 85 99132-3344
export const SAFETY_LOCK_NUMBER = "5585991323344";

export function generateWhatsAppLink(originalPhone: string, message: string): string {
    // Normalize phone number (remove non-digits)
    const cleanPhone = originalPhone.replace(/\D/g, '');

    let targetPhone = cleanPhone;
    let finalMessage = message;

    if (SAFETY_LOCK_ENABLED) {
        // Redirect to safety number
        targetPhone = SAFETY_LOCK_NUMBER;
        // Prepend context so the tester knows who this was for
        finalMessage = `[MODO TESTE] Para: ${originalPhone}\n\n${message}`;
    } else {
        // Ensure Brazil country code if missing (naive check)
        if (targetPhone.length <= 11 && !targetPhone.startsWith('55')) {
            targetPhone = `55${targetPhone}`;
        }
    }

    const encodedMessage = encodeURIComponent(finalMessage);
    return `https://wa.me/${targetPhone}?text=${encodedMessage}`;
}

export async function sendWhatsAppMessage(originalPhone: string, message: string): Promise<{ success: boolean; error?: string }> {
    let targetPhone = originalPhone.replace(/\D/g, '');
    let finalMessage = message;

    if (SAFETY_LOCK_ENABLED) {
        // Redirect to safety number for testing
        finalMessage = `[TRAVA DE SEGURANÇA] Destino Original: ${originalPhone}\n\n${message}`;
        targetPhone = SAFETY_LOCK_NUMBER;
    } else {
        // Ensure Brazil country code
        if (targetPhone.length <= 11 && !targetPhone.startsWith('55')) {
            targetPhone = `55${targetPhone}`;
        }
    }

    try {
        const response = await fetch('http://localhost:3001/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone: targetPhone,
                message: finalMessage,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            return { success: true };
        } else {
            console.error('[WhatsApp] Server Error:', data);
            return { success: false, error: data.error || 'Falha no servidor local' };
        }
    } catch (error) {
        console.error('[WhatsApp] Connection Error:', error);
        return { success: false, error: 'Servidor do WhatsApp não detectado (localhost:3001)' };
    }
}
