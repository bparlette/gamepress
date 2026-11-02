# Remote Roblox Studio MCP Access Guide

This guide explains how to expose the local **Roblox Studio MCP** (`StudioMCP`) over a secure public HTTPS endpoint so remote AI agents (running in cloud VMs, remote IDEs, or autonomous agent loops) can control Roblox Studio, inspect the DataModel, execute Luau, generate scenes, and capture rendered views.

---

## Architecture Overview

```
[Remote AI Agent / Cloud LLM]
       │ (HTTPS POST / JSON-RPC)
       ▼
[Cloudflare Tunnel (*.trycloudflare.com)]
       │ (Secure TLS Reverse Proxy)
       ▼
[Local Bridge: tools/roblox_mcp_bridge.py (127.0.0.1:8080)]
       │ (stdio JSON-RPC)
       ▼
[/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP]
       │ (Local IPC)
       ▼
[Roblox Studio 0.745+ Runtime]
```

---

## 1. Prerequisites

1. **Roblox Studio**: Installed on the local host with `StudioMCP` present at:
   `/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP`
2. **Cloudflare Tunnel CLI**: `cloudflared` installed locally:
   ```bash
   brew install cloudflared
   ```
3. **Python 3.8+** (standard library only; no extra pip packages required).

---

## 2. Quick Start

### Step A: Set an Optional Security Token (Recommended)
To protect your Studio session against unauthorized remote calls:
```bash
export ROBLOX_MCP_AUTH_KEY="your-secure-random-token"
```

### Step B: Launch the Bridge & Tunnel
Run the launch script from the repo root:
```bash
./tools/start_remote_mcp.sh
```

The script will launch the local HTTP bridge on `127.0.0.1:8080` and output a temporary Cloudflare tunnel URL, e.g.:
```
2026-11-02 ... +--------------------------------------------------------------------------------------------+
2026-11-02 ... |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
2026-11-02 ... |  https://alpha-beta-sample.trycloudflare.com                                               |
2026-11-02 ... +--------------------------------------------------------------------------------------------+
```

---

## 3. Remote Agent Configuration

On the remote machine or agent host, configure the MCP client using the public URL:

### Remote `mcp_config.json`:
```json
{
  "mcpServers": {
    "Remote_Roblox_Studio": {
      "url": "https://alpha-beta-sample.trycloudflare.com",
      "headers": {
        "Authorization": "Bearer your-secure-random-token"
      }
    }
  }
}
```

---

## 4. Verification & Testing

### Health Check (GET)
```bash
curl -s https://alpha-beta-sample.trycloudflare.com/
# Output: {"status": "ok", "service": "Roblox Studio MCP Bridge"}
```

### Test JSON-RPC Call (POST)
To list active Studio instances from the remote agent:
```bash
curl -X POST https://alpha-beta-sample.trycloudflare.com/ \
  -H "Authorization: Bearer your-secure-random-token" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "list_roblox_studios",
      "arguments": {}
    }
  }'
```

---

## 5. Security Best Practices

1. **Always Set `ROBLOX_MCP_AUTH_KEY`**: If left unset, anyone who discovers the tunnel URL can execute code inside your local Roblox Studio.
2. **Close Tunnel When Inactive**: Terminate `./tools/start_remote_mcp.sh` (Ctrl+C) when the remote testing session ends.
3. **No Private Secrets Stored in Repo**: Never commit persistent Cloudflare credentials, API tokens, or session IDs. The scripts use environment variables and ephemeral tunnels by default.
