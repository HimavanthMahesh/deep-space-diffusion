import http.server
import json
import os
import urllib.request
import urllib.parse
import socketserver

MODAL_URL = os.environ.get("MODAL_URL", "").strip()
MAX_PROMPT_LENGTH = 500


def build_modal_url(prompt, base_url=None):
    base_url = (base_url if base_url is not None else MODAL_URL).strip()
    prompt = prompt.strip() or "deep space nebula"

    if not base_url:
        raise RuntimeError("MODAL_URL is not configured")
    if len(prompt) > MAX_PROMPT_LENGTH:
        raise ValueError(f"Prompt must be {MAX_PROMPT_LENGTH} characters or fewer")

    return f"{base_url}?prompt={urllib.parse.quote(prompt)}"

class Handler(http.server.SimpleHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith('/generate'):
            idx = self.path.find('?')
            query = self.path[idx + 1:] if idx != -1 else ''
            params = urllib.parse.parse_qs(query)
            prompt = params.get('prompt', ['deep space nebula'])[0]

            try:
                url = build_modal_url(prompt)
                print(f"Proxying: {prompt[:60]}...")
                with urllib.request.urlopen(url, timeout=300) as resp:
                    data = resp.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)
            except ValueError as exc:
                self.send_json(400, {"error": str(exc)})
            except RuntimeError as exc:
                self.send_json(503, {"error": str(exc)})
            except Exception as e:
                print(f"Error: {e}")
                self.send_json(502, {"error": "The generation service is unavailable"})
        else:
            super().do_GET()

    def log_message(self, format, *args):
        pass  # suppress static file logs

def main():
    with socketserver.ThreadingTCPServer(("", 8080), Handler) as httpd:
        print("Serving at http://localhost:8080")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
