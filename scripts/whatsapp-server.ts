// WhatsApp Server using Venom-Bot and Google Gemini AI
import { create, Whatsapp } from 'venom-bot';
import * as http from 'http';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("⚠️ AVISO: GEMINI_API_KEY não encontrada em .env.local! O bot não conseguirá responder.");
}
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

const PORT = 3001;

// --- Conversation Memory ---
const userMemory = new Map<string, { role: string, parts: { text: string }[] }[]>();

// --- System Prompt ---
const SYSTEM_PROMPT = `Você é o assistente virtual da Lavateria (Lavanderia Self-Service).
Sua missão é ser extremamente educado, rápido e focado em ajudar o cliente a usar nossas máquinas ou tirar dúvidas.
Informações importantes:
- Cada ciclo de lavagem (40 minutos) ou secagem (45 minutos) custa R$ 18,00.
- O cliente precisa do aplicativo VMPay para pagar e liberar a máquina.
- As máquinas suportam até 10kg de roupas ou 1 edredom de casal padrão.
- Se o cliente relatar um erro grave na máquina ou pedir estorno, diga: "Entendi. Vou pedir para um humano da nossa equipe técnica assumir o atendimento para resolver isso para você o mais rápido possível."
Aja sempre de forma muito gentil e prestativa. Nunca invente preços ou promoções. Seja muito conciso e direto nas respostas do WhatsApp.`;

const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 5000;

let client: Whatsapp;

// --- Start Venom ---
create({
    session: 'vmpay-session',
    headless: true, // Voltar para true para evitar instabilidade com interface gráfica do chrome
    logQR: true, // Imprimir o QR Code no terminal!
    debug: false,
    devtools: false,
    browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'], // Fix for Windows stability
    disableSpins: true, // Clean terminal
    disableWelcome: true, // Clean terminal
    updatesLog: false, // Clean terminal
    autoClose: 0,
})
    .then((c) => {
        client = c;
        console.log('[WhatsApp Server] Venom-Bot conectado! 🚀');
        startHttpServer();
        startListening(c);
    })
    .catch((erro) => {
        console.log('[Error] Falha ao iniciar Venom:', erro);
    });

// --- Incoming Messages Handler (Gemini AI) ---
function startListening(client: Whatsapp) {
    console.log('[WhatsApp Server] Escutando mensagens para a IA...');
    
    client.onAnyMessage(async (message) => {
        const phone = message.from;
        console.log(`[DEBUG] Recebi um evento bruto de ${phone}. Body: ${message.body}, fromMe: ${message.fromMe}, isGroup: ${message.isGroupMsg}, type: ${message.type}`);
        
        if (message.fromMe) return; // Se eu mesmo enviei, não respondo
        if (message.isGroupMsg || !message.body) return; 

        
        try {
            // Get or initialize history
            let history = userMemory.get(phone) || [];
            
            // Add user message to history
            history.push({ role: 'user', parts: [{ text: message.body }] });
            
            // Keep only last 10 interactions to avoid memory/context bloat
            if (history.length > 20) history = history.slice(history.length - 20);
            
            // Simulando que está "Digitando..."
            await client.startTyping(phone);
            
            // Call Gemini
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: history,
                config: {
                    systemInstruction: SYSTEM_PROMPT,
                    temperature: 0.7
                }
            });
            
            const replyText = response.text || "Desculpe, não entendi.";
            
            // Save assistant reply
            history.push({ role: 'model', parts: [{ text: replyText }] });
            userMemory.set(phone, history);
            
            // Random Delay for human-like feeling
            const waitTime = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
            await new Promise(r => setTimeout(r, waitTime));
            
            await client.sendText(phone, replyText);
            await client.stopTyping(phone);
            console.log(`[WhatsApp] Resposta IA enviada para ${phone}`);

        } catch (error) {
            console.error('[Gemini Error]', error);
            await client.sendText(phone, "Estou com uma pequena instabilidade no meu sistema no momento, por favor aguarde um instante.");
        }
    });
}

// --- Outbound Queue (Legacy) ---
interface QueueItem {
    phone: string;
    message: string;
    attempts: number;
}
const messageQueue: QueueItem[] = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || messageQueue.length === 0 || !client) return;
    isProcessing = true;
    const item = messageQueue[0];

    try {
        console.log(`[Queue] Processando envio outbound para ${item.phone}...`);
        await client.sendText(item.phone, item.message);
        messageQueue.shift();
        setTimeout(() => { isProcessing = false; processQueue(); }, 2000);
    } catch (error) {
        console.error('[Queue Error]', error);
        item.attempts++;
        if (item.attempts >= 3) messageQueue.shift();
        isProcessing = false;
        setTimeout(processQueue, 5000);
    }
}

// --- HTTP Server ---
function startHttpServer() {
    const server = http.createServer((req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200); res.end(); return;
        }

        if (req.url === '/send' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { phone, message } = JSON.parse(body);
                    if (!phone || !message) {
                        res.writeHead(400); res.end(JSON.stringify({ error: 'Missing phone/message' })); return;
                    }
                    let formattedPhone = phone.replace(/\D/g, '');
                    if (formattedPhone.length <= 11 && !formattedPhone.startsWith('55')) formattedPhone = '55' + formattedPhone;
                    if (!formattedPhone.includes('@c.us')) formattedPhone += '@c.us';

                    messageQueue.push({ phone: formattedPhone, message, attempts: 0 });
                    processQueue();

                    res.writeHead(200); res.end(JSON.stringify({ status: 'queued', position: messageQueue.length }));
                } catch (e) {
                    res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
            return;
        }

        if (req.url === '/status' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ connected: !!client, queueLength: messageQueue.length }));
            return;
        }

        res.writeHead(404); res.end();
    });

    server.listen(PORT, () => {
        console.log(`[HTTP Server] API rodando em http://localhost:${PORT}`);
    });
}
