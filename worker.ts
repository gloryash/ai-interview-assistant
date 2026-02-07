/**
 * Cloudflare Worker 入口：处理 WebSocket 代理 + 静态资源
 */

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket 代理：/dashscope-ws/*
    if (url.pathname.startsWith('/dashscope-ws/')) {
      return handleWebSocketProxy(request, url);
    }

    // 其他请求：交给静态资源处理
    return env.ASSETS.fetch(request);
  },
};

async function handleWebSocketProxy(request: Request, url: URL): Promise<Response> {
  const upgradeHeader = request.headers.get('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  const apiKey = url.searchParams.get('api_key');
  if (!apiKey) {
    return new Response('Missing api_key parameter', { status: 400 });
  }

  // 构建 DashScope 目标 URL
  const targetPath = url.pathname.replace(/^\/dashscope-ws/, '');
  const targetUrl = `https://dashscope.aliyuncs.com${targetPath}${url.search}`;

  // 连接 DashScope，通过 Authorization header 认证
  const dashscopeResp = await fetch(targetUrl, {
    headers: {
      'Upgrade': 'websocket',
      'Authorization': `bearer ${apiKey}`,
    },
  });

  const dashscopeWs = dashscopeResp.webSocket;
  if (!dashscopeWs) {
    return new Response('Failed to connect to DashScope', { status: 502 });
  }
  dashscopeWs.accept();

  // 创建客户端 WebSocket 对
  const pair = new WebSocketPair();
  const [clientWs, serverWs] = Object.values(pair);
  serverWs.accept();

  // 双向转发：客户端 → DashScope
  serverWs.addEventListener('message', (event) => {
    try { dashscopeWs.send(event.data); } catch {}
  });
  serverWs.addEventListener('close', () => {
    dashscopeWs.close();
  });

  // 双向转发：DashScope → 客户端
  dashscopeWs.addEventListener('message', (event) => {
    try { serverWs.send(event.data); } catch {}
  });
  dashscopeWs.addEventListener('close', () => {
    serverWs.close();
  });

  return new Response(null, { status: 101, webSocket: clientWs });
}
