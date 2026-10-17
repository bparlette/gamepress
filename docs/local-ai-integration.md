# Local AI Engine & Qwen 14B Integration

This document explains how to set up, automate, and interface with the locally hosted **Qwen2.5-Coder-14B-Instruct** model inside `gamepress` (or as part of your universal local AI toolkit).

---

## 1. Quick Start & Setup Script

A one-click setup script is included in `tools/local-ai/setup-qwen14b.sh`:

```bash
cd tools/local-ai
./setup-qwen14b.sh
```

### What the script does:
1. Pulls `qwen2.5-coder:14b` (~9.0 GB, `Q4_K_M`) into Ollama.
2. Installs a macOS LaunchAgent (`~/Library/LaunchAgents/com.ollama.keepalive.plist`) so the model stays **permanently loaded in Apple Silicon Unified Memory/VRAM** across reboots (`keepalive: -1`).
3. Warms up the model instantly so subsequent script requests have zero cold-start delay.

---

## 2. Launching the Local Chatbot Task Workbench

A modern web-based UI is included to interact with and task the local model:

```bash
cd tools/local-ai
node server.mjs
```

* **Web UI URL:** `http://localhost:8088`
* Features real-time token streaming, dark mode developer UI, auto-scrolling terminal, and multi-turn conversation memory.
* Zero external npm dependencies (uses native Node.js HTTP).

---

## 3. How Other Scripts & AI Agents Can Connect

Ollama exposes standard REST endpoints compatible with both the native Ollama API and OpenAI-compatible API schemas.

### A. Direct HTTP (Ollama Native)

```bash
curl http://127.0.0.1:11434/api/generate -d '{
  "model": "qwen2.5-coder:14b",
  "prompt": "Write a Node.js script to crop a 16:9 image into a vertical 9:16 canvas with blurred background.",
  "stream": false,
  "keep_alive": -1
}'
```

### B. OpenAI-Compatible SDKs (Python / TypeScript / LangChain)

Point your base URL to `http://127.0.0.1:11434/v1` and set `api_key="ollama"`:

#### Python:
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:11434/v1",
    api_key="ollama"
)

response = client.chat.completions.create(
    model="qwen2.5-coder:14b",
    messages=[
        {"role": "system", "content": "You are a specialized code generator for game press automation."},
        {"role": "user", "content": "Generate a capture plan for a 2D web platformer."}
    ],
    temperature=0.2
)

print(response.choices[0].message.content)
```

#### Node.js / TypeScript:
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://127.0.0.1:11434/v1',
  apiKey: 'ollama'
});

const completion = await openai.chat.completions.create({
  model: 'qwen2.5-coder:14b',
  messages: [{ role: 'user', content: 'Generate a meta.json description for an arcade game.' }]
});

console.log(completion.choices[0].message.content);
```
