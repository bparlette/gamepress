#!/usr/bin/env bash
# setup-qwen14b.sh - Configures and pins Qwen2.5-Coder-14B in Ollama permanently
set -euo pipefail

MODEL="qwen2.5-coder:14b"

echo "=== 1. Checking Ollama CLI ==="
if ! command -v ollama &>/dev/null; then
  echo "Error: Ollama is not installed. Install via Homebrew: brew install ollama"
  exit 1
fi

echo "=== 2. Pulling ${MODEL} ==="
ollama pull "${MODEL}"

echo "=== 3. Setting up Persistent Keep-Alive LaunchAgent ==="
PLIST_PATH="${HOME}/Library/LaunchAgents/com.ollama.keepalive.plist"
mkdir -p "${HOME}/Library/LaunchAgents"

cat << EOF > "${PLIST_PATH}"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ollama.keepalive</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/sh</string>
        <string>-c</string>
        <string>while true; do $(which ollama) run ${MODEL} "" --keepalive -1 2>/dev/null || true; sleep 60; done</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/ollama_keepalive.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ollama_keepalive.err</string>
</dict>
</plist>
EOF

echo "=== 4. Loading LaunchAgent ==="
launchctl unload "${PLIST_PATH}" 2>/dev/null || true
launchctl load -w "${PLIST_PATH}"

echo "=== 5. Warming Model in VRAM ==="
curl -s http://127.0.0.1:11434/api/generate -d "{\"model\": \"${MODEL}\", \"keep_alive\": -1}" > /dev/null

echo "=== 6. Status Check ==="
curl -s http://127.0.0.1:11434/api/ps | grep "${MODEL}" && echo "✅ ${MODEL} is locked in memory and ready!" || echo "⚠️ Model loading in background..."
