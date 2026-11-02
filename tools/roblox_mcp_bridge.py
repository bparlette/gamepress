#!/usr/bin/env python3
"""
Roblox Studio MCP HTTP Bridge
Proxies incoming HTTP JSON-RPC calls from remote AI agents into StudioMCP stdio.
"""

import os
import sys
import json
import threading
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler

STUDIO_MCP_BIN = "/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP"
PORT = int(os.environ.get("ROBLOX_MCP_PORT", 8080))
AUTH_TOKEN = os.environ.get("ROBLOX_MCP_AUTH_KEY")

class StudioMCPBridge:
    def __init__(self):
        if not os.path.exists(STUDIO_MCP_BIN):
            sys.stderr.write(f"Error: StudioMCP binary not found at {STUDIO_MCP_BIN}\n")
            sys.exit(1)

        self.proc = subprocess.Popen(
            [STUDIO_MCP_BIN],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        self.lock = threading.Lock()

    def send(self, payload):
        with self.lock:
            try:
                self.proc.stdin.write(json.dumps(payload) + "\n")
                self.proc.stdin.flush()
                line = self.proc.stdout.readline()
                if line:
                    return json.loads(line)
            except Exception as e:
                return {"error": str(e)}
            return {}

bridge = None

class RequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Concise logging
        sys.stdout.write(f"[StudioMCP-Bridge] {self.address_string()} - {format % args}\n")

    def do_GET(self):
        # Health check endpoint
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        status = {"status": "ok", "service": "Roblox Studio MCP Bridge"}
        self.wfile.write(json.dumps(status).encode("utf-8"))

    def do_POST(self):
        # Bearer token validation (if configured)
        if AUTH_TOKEN:
            auth = self.headers.get("Authorization", "")
            if auth != f"Bearer {AUTH_TOKEN}":
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"error": "Unauthorized"}')
                return

        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self.send_response(400)
            self.end_headers()
            return

        body = self.rfile.read(content_length).decode("utf-8")
        try:
            req = json.loads(body)
            resp = bridge.send(req)
            resp_bytes = json.dumps(resp).encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(resp_bytes)))
            self.end_headers()
            self.wfile.write(resp_bytes)
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

def main():
    global bridge
    bridge = StudioMCPBridge()
    server = HTTPServer(("127.0.0.1", PORT), RequestHandler)
    print(f"Roblox Studio MCP Bridge running on http://127.0.0.1:{PORT}")
    if AUTH_TOKEN:
        print("Bearer token authentication: ENABLED")
    else:
        print("Bearer token authentication: DISABLED (Local dev mode)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down bridge...")
        if bridge and bridge.proc:
            bridge.proc.terminate()

if __name__ == "__main__":
    main()
