const express = require('express');
const app = express();

// 1x1 прозрачный GIF пиксель
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

app.get('/track.jpg', (req, res) => {
    // Получаем публичный IP жертвы
    let ip = req.ip || req.connection.remoteAddress;
    
    // Если за прокси/CDN
    if (req.headers['x-forwarded-for']) {
        ip = req.headers['x-forwarded-for'].split(',')[0];
    } else if (req.headers['x-real-ip']) {
        ip = req.headers['x-real-ip'];
    }
    
    // Убираем IPv6 префикс если есть
    ip = ip.replace('::ffff:', '');
    
    console.log(`[+] Public IP: ${ip}`);
    console.log(`[+] User-Agent: ${req.headers['user-agent']}`);
    console.log(`[+] Referer: ${req.headers['referer'] || 'direct'}`);
    
    // Сохраняем в файл
    const log = `${new Date().toISOString()} | IP: ${ip} | UA: ${req.headers['user-agent']}\n`;
    console.log(log)
    
    res.set('Content-Type', 'image/gif');
    res.send(PIXEL);
});

app.listen(3000, () => {
    console.log('[+] Сервер на http://0.0.0.0:3000');
    console.log('[+] Отправьте жертве: http://ваш-сервер:3000/track.jpg');
});