import http.server
import urllib.request
import urllib.parse
import socketserver

MODAL_URL = "https://doomedexpedition--cosmic-horror-sdxl-cosmichorrorgenerat-58e5bd.modal.run"

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/generate'):
            idx = self.path.find('?')
            query = self.path[idx + 1:] if idx != -1 else ''
            params = urllib.parse.parse_qs(query)
            prompt = params.get('prompt', ['deep space nebula'])[0]

            url = f"{MODAL_URL}?prompt={urllib.parse.quote(prompt)}"
            print(f"Proxying: {prompt[:60]}...")
            try:
                with urllib.request.urlopen(url, timeout=300) as resp:
                    data = resp.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)
            except Exception as e:
                print(f"Error: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(f'{{"error": "{str(e)}"}}'.encode())
        else:
            super().do_GET()

    def log_message(self, format, *args):
        pass  # suppress static file logs

with socketserver.TCPServer(("", 8080), Handler) as httpd:
    print("Serving at http://localhost:8080")
    httpd.serve_forever()
