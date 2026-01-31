/**
 * 飞书上传本地服务器
 * 端口: 3001
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAppAccessToken, uploadMarkdownToWiki } from './feishu-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3001;

// 读取配置
async function loadConfig() {
  const configPath = path.resolve(__dirname, '../../feishu.config.json');
  try {
    const content = await fs.readFile(configPath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    throw new Error('请先创建 feishu.config.json 配置文件');
  }
}

// 解析请求体
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// CORS 头
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// 发送 JSON 响应
function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Token 缓存
let tokenCache = { token: null, expiresAt: 0 };

async function getToken(config) {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  const token = await getAppAccessToken(config.appId, config.appSecret);
  tokenCache = { token, expiresAt: now + 7000 * 1000 }; // 约2小时
  return token;
}

// 创建服务器
const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // 健康检查
  if (url.pathname === '/health') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  // 上传文档
  if (url.pathname === '/api/upload' && req.method === 'POST') {
    try {
      const config = await loadConfig();
      const body = await parseBody(req);

      if (!body.markdown) {
        sendJson(res, 400, { error: '缺少 markdown 参数' });
        return;
      }

      const token = await getToken(config);
      const result = await uploadMarkdownToWiki(token, config.spaceId, body.markdown);

      sendJson(res, 200, { success: true, ...result });
    } catch (err) {
      console.error('上传失败:', err.message);
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 404
  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`飞书上传服务已启动: http://localhost:${PORT}`);
  console.log('可用接口:');
  console.log('  POST /api/upload - 上传 Markdown 到飞书知识库');
  console.log('  GET  /health     - 健康检查');
});
