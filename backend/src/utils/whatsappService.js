const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

let client;
let qrCodeData = null;
let status = 'DISCONNECTED'; // 'DISCONNECTED', 'QR_READY', 'AUTHENTICATED', 'READY'

const initWhatsApp = () => {
    // LocalAuth saves the session data so we don't have to scan every time
    client = new Client({
        authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage', 
                '--disable-accelerated-2d-canvas', 
                '--no-first-run', 
                '--no-zygote', 
                '--disable-gpu'
            ]
        }
    });

    client.on('qr', async (qr) => {
        // Generate and save the QR code as base64 Data URI
        try {
            qrCodeData = await qrcode.toDataURL(qr);
            status = 'QR_READY';
            console.log('WhatsApp QR code ready to be scanned.');
        } catch (err) {
            console.error('Failed to generate QR code data URI', err);
        }
    });

    client.on('ready', () => {
        status = 'READY';
        qrCodeData = null; // Clear QR code as it's no longer needed
        console.log('WhatsApp Client is ready!');
    });

    client.on('authenticated', () => {
        status = 'AUTHENTICATED';
        console.log('WhatsApp Client is authenticated!');
    });

    client.on('auth_failure', msg => {
        console.error('WhatsApp Authentication failure', msg);
        status = 'DISCONNECTED';
        qrCodeData = null;
    });

    client.on('disconnected', (reason) => {
        console.log('WhatsApp Client was disconnected', reason);
        status = 'DISCONNECTED';
        qrCodeData = null;
        
        // Let's re-initialize to generate a new QR
        setTimeout(() => {
            console.log('Re-initializing WhatsApp client...');
            client.initialize().catch(err => {
                console.error('Failed to re-initialize WhatsApp client:', err);
            });
        }, 5000);
    });

    client.initialize().catch(err => {
        console.error('Failed to initialize WhatsApp client:', err);
    });
};

const getStatus = () => {
    return { status, qrCode: qrCodeData };
};

const sendMessage = async (phone, message) => {
    if (status !== 'READY') {
        throw new Error('WhatsApp client is not ready. Please scan the QR code first.');
    }
    
    // Normalize phone number: strip non-digits
    const cleanPhone = phone.replace(/\D/g, '');
    const chatId = `${cleanPhone}@c.us`;
    
    try {
        await client.sendMessage(chatId, message);
        return true;
    } catch (err) {
        console.error('Failed to send WhatsApp message', err);
        throw err;
    }
};

const resetConnection = async () => {
    try {
        if (client) {
            await client.destroy();
        }
    } catch(e) {
        console.error(e);
    }
    status = 'DISCONNECTED';
    qrCodeData = null;
    initWhatsApp();
};

module.exports = { initWhatsApp, getStatus, sendMessage, resetConnection };
