#!/bin/bash
# Launch script for Roblox Studio MCP Bridge + Cloudflare Tunnel
set -e

PORT=${ROBLOX_MCP_PORT:-8080}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Starting Roblox Studio MCP Remote Bridge ==="
python3 "$SCRIPT_DIR/roblox_mcp_bridge.py" &
BRIDGE_PID=$!

cleanup() {
    echo "Stopping bridge (PID: $BRIDGE_PID)..."
    kill $BRIDGE_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Wait for local bridge port to open
sleep 2

echo "=== Starting Cloudflare Public Tunnel ==="
echo "Point your remote AI agent's MCP config to the https://*.trycloudflare.com URL shown below:"
cloudflared tunnel --url "http://127.0.0.1:$PORT"
