// WhatsApp Server using Venom-Bot (Alternative to Baileys)
import { create, Whatsapp } from 'venom-bot';
import * as http from 'http';

const PORT = 3001;

// --- Safety Config ---
const MIN_DELAY_MS = 10000; // 10s
const MAX_DELAY_MS = 25000; // 25s
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 20;

interface QueueItem {
    phone: string;
    message: string;
    attempts: number;
}

const messageQueue: QueueItem[] = [];
let isProcessing = false;
let client: Whatsapp;

// --- Start Venom ---
create({
    session: 'vmpay-session',
    headless: false, // Fix: Open visible window
    logQR: false, // Disable terminal QR, use window instead
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
    })
    .catch((erro) => {
        console.log('[Error] Falha ao iniciar Venom:', erro);
    });

// --- Queue Processor ---
async function processQueue() {
    if (isProcessing || messageQueue.length === 0) return;
    if (!client) return;

    isProcessing = true;
    const item = messageQueue[0];

    try {
        console.log(`[Queue] Processando envio para ${item.phone}...`);

        // Check Working Hours
        const currentHour = new Date().getHours();
        if (currentHour < WORK_START_HOUR || currentHour >= WORK_END_HOUR) {
            console.log('[Safety] Fora do horário comercial. Aguardando...');
            setTimeout(() => { isProcessing = false; processQueue(); }, 60000 * 5); // 5 min
            return;
        }

        // Simulate Typing (optional support in venom?)
        // client.startTyping(item.phone); 
        await delay(2000);

        // Send Text
        await client.sendText(item.phone, item.message);
        console.log(`[Success] Enviado para ${item.phone}`);

        messageQueue.shift();

        // Random Delay
        const waitTime = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
        console.log(`[Safety] Aguardando ${waitTime / 1000}s...`);

        setTimeout(() => {
            isProcessing = false;
            processQueue();
        }, waitTime);

    } catch (error) {
        console.error('[Error] Falha ao enviar:', error);
        item.attempts++;
        if (item.attempts >= 3) {
            console.log(`[Queue] Descartando mensagem após 3 falhas.`);
            messageQueue.shift();
        }
        isProcessing = false;
        setTimeout(processQueue, 5000);
    }
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- HTTP Server ---
function startHttpServer() {
    const server = http.createServer((req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (req.url === '/send' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { phone, message } = JSON.parse(body);

                    if (!phone || !message) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Missing phone/message' }));
                        return;
                    }

                    // Format Phone for Venom (558599...@c.us)
                    let formattedPhone = phone.replace(/\D/g, '');
                    if (formattedPhone.length <= 11 && !formattedPhone.startsWith('55')) {
                        formattedPhone = '55' + formattedPhone;
                    }
                    if (!formattedPhone.includes('@c.us')) {
                        formattedPhone += '@c.us';
                    }

                    messageQueue.push({ phone: formattedPhone, message, attempts: 0 });
                    processQueue();

                    res.writeHead(200);
                    res.end(JSON.stringify({ status: 'queued', position: messageQueue.length }));

                } catch (e) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
            return;
        }

        if (req.url === '/status' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                connected: !!client,
                queueLength: messageQueue.length
            }));
            return;
        }

        res.writeHead(404);
        res.end();
    });

    server.listen(PORT, () => {
        console.log(`[HTTP Server] Rodando em http://localhost:${PORT}`);
    });
}
