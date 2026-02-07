/**
 * Cloudflare Pages Function: DashScope WebSocket 代理
 * 用 WebSocketPair 桥接客户端和 DashScope，将 api_key 转为 Authorization header
 */
export const onRequest: PagesFunction = async (context) => {
  const upgradeHeader = context.request.headers.get('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  const url = new URL(context.request.url);
  const apiKey = url.searchParams.get('api_key');
  if (!apiKey) {
    return new Response('Missing api_key parameter', { status: 400 });
  }

  // 构建 DashScope 目标 URL（保留原始 query 参数）
  const pathAfterPrefix = url.pathname.replace(/^\/dashscope-ws/, '');
  const targetUrl = `https://dashscope.aliyuncs.com${pathAfterPrefix}${url.search}`;

  // 连接 DashScope WebSocket，通过 Authorization header 认证
  const dashscopeResp = await fetch(targetUrl, {
    headers: {
      'Upgrade': 'websocket',
      'Authorization': `bearer ${apiKey}`,
    },
  });

  const dashscopeWs = dashscopeResp.webSocket;
  if (!dashscopeWs) {
    return new Response('Failed to connect to DashScope WebSocket', { status: 502 });
  }
  dashscopeWs.accept();

  // 创建客户端 WebSocket 对
  const pair = new WebSocketPair();
  const [clientWs, serverWs] = Object.values(pair);
  serverWs.accept();

  // 双向转发：客户端 → DashScope
  serverWs.addEventListener('message', (event) => {
    try {
      dashscopeWs.send(event.data);
    } catch { /* 连接已关闭 */ }
  });
  serverWs.addEventListener('close', () => {
    dashscopeWs.close();
  });

  // 双向转发：DashScope → 客户端
  dashscopeWs.addEventListener('message', (event) => {
    try {
      serverWs.send(event.data);
    } catch { /* 连接已关闭 */ }
  });
  dashscopeWs.addEventListener('close', () => {
    serverWs.close();
  });

  return new Response(null, { status: 101, webSocket: clientWs });
};
