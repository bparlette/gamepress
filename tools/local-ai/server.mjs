#!/usr/bin/env node
// server.mjs - Lightweight, zero-dependency proxy & UI server for local Qwen2.5-Coder-14B
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8088;
const OLLAMA_HOST = process.env.OLLAMA_HOST || '127.0.0.1';
const OLLAMA_PORT = process.env.OLLAMA_PORT || 11434;
const MODEL = process.env.MODEL || 'qwen2.5-coder:14b';

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Chat Proxy -> Ollama API
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const payload = JSON.stringify({
          model: MODEL,
          messages: parsed.messages || [],
          stream: true,
          keep_alive: -1
        });

        const ollamaReq = http.request({
          hostname: OLLAMA_HOST,
          port: OLLAMA_PORT,
          path: '/api/chat',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, (ollamaRes) => {
          res.writeHead(ollamaRes.statusCode, ollamaRes.headers);
          ollamaRes.pipe(res);
        });

        ollamaReq.on('error', (err) => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to connect to Ollama: ' + err.message }));
        });

        ollamaReq.write(payload);
        ollamaReq.end();
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON request: ' + err.message }));
      }
    });
    return;
  }

  // 2. Serve Web UI
  if (req.url === '/' || req.url === '/index.html') {
    const htmlPath = path.join(__dirname, 'web', 'index.html');
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(htmlPath).pipe(res);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Qwen2.5-Coder-14B UI Workbench is live!`);
  console.log(`👉 Open in browser: http://localhost:${PORT}`);
  console.log(`📡 Backend Ollama:  http://${OLLAMA_HOST}:${OLLAMA_PORT} (Model: ${MODEL})`);
  console.log(`======================================================\n`);
});
