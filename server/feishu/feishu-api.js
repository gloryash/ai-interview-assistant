/**
 * 飞书 API 封装
 * 使用 App Access Token（应用身份）
 */

import { markdownToBlocks, BLOCK_TYPE } from './feishu-md.js';

const API_BASE = 'https://open.feishu.cn/open-apis';

/**
 * 获取 App Access Token
 */
export async function getAppAccessToken(appId, appSecret) {
  const response = await fetch(`${API_BASE}/auth/v3/app_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`获取 App Access Token 失败: ${data.msg}`);
  }

  return data.app_access_token;
}

/**
 * 通用 API 请求
 */
async function apiRequest(method, path, token, { query = {}, body } = {}) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json; charset=utf-8';
    options.body = JSON.stringify(body);
  }

  console.log(`[API] ${method} ${path}`);
  const response = await fetch(url, options);
  const data = await response.json();

  if (data.code !== 0) {
    console.error(`[API Error] ${path}:`, JSON.stringify(data, null, 2));
    if (body) {
      console.error('[Request Body]:', JSON.stringify(body, null, 2).slice(0, 500));
    }
    throw new Error(`API 错误 (${data.code}): ${data.msg}`);
  }

  return data.data ?? data;
}

/**
 * 创建文档
 */
async function createDocument(token, title) {
  const data = await apiRequest('POST', '/docx/v1/documents', token, {
    body: { title },
  });
  return {
    documentId: data.document?.document_id,
    usedTitle: true,
  };
}

/**
 * 获取文档根 block
 */
async function getDocumentBlocks(documentId, token) {
  const data = await apiRequest('GET', `/docx/v1/documents/${documentId}/blocks`, token, {
    query: { page_size: 500 },
  });
  return data.items || [];
}

/**
 * 删除文档所有子块
 */
async function deleteAllChildren(documentId, token) {
  const blocks = await getDocumentBlocks(documentId, token);
  const rootBlock = blocks.find((b) => b.block_type === 1);
  if (!rootBlock) return;

  const childIds = rootBlock.page?.body?.children || rootBlock.children || [];
  if (childIds.length === 0) return;

  for (let i = 0; i < childIds.length; i += 100) {
    const batch = childIds.slice(i, i + 100);
    await apiRequest('DELETE', `/docx/v1/documents/${documentId}/blocks/batch_delete`, token, {
      body: { block_ids: batch },
    });
  }
}

/**
 * 清理块数据，移除内部字段
 */
function cleanBlock(block) {
  const cleaned = { ...block };
  // 移除内部字段
  delete cleaned._table;
  return cleaned;
}

/**
 * 过滤不支持的块类型
 */
function filterSupportedBlocks(blocks) {
  // 表格块 (31) 需要特殊 API，暂时跳过
  return blocks.filter(b => b.block_type !== 31).map(cleanBlock);
}

/**
 * 批量创建块
 */
async function createBlocks(documentId, token, blocks, parentId) {
  if (blocks.length === 0) return [];

  const supportedBlocks = filterSupportedBlocks(blocks);
  if (supportedBlocks.length === 0) return [];

  const data = await apiRequest('POST', `/docx/v1/documents/${documentId}/blocks/${parentId}/children`, token, {
    body: { children: supportedBlocks, index: -1 },
  });
  return data.children || [];
}

/**
 * 追加块到文档
 */
async function appendBlocks(documentId, token, blocks) {
  const allBlocks = await getDocumentBlocks(documentId, token);
  const rootBlock = allBlocks.find((b) => b.block_type === 1);
  if (!rootBlock) throw new Error('找不到文档根块');

  const rootId = rootBlock.block_id;
  const results = [];

  for (let i = 0; i < blocks.length; i += 50) {
    const batch = blocks.slice(i, i + 50);
    const created = await createBlocks(documentId, token, batch, rootId);
    results.push(...created);
  }

  return results;
}

/**
 * 将文档移动到知识库
 */
async function moveDocToWiki(token, spaceId, documentId, title) {
  const data = await apiRequest('POST', `/wiki/v2/spaces/${spaceId}/nodes`, token, {
    body: {
      obj_type: 'docx',
      obj_token: documentId,
      node_type: 'origin',
      title: title,
    },
  });
  return data.node;
}

/**
 * 生成带时间戳的文档标题
 */
function generateDocTitle(baseTitle) {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 16).replace('T', ' ').replace(':', '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${baseTitle}_${timestamp}_${random}`;
}

/**
 * 上传 Markdown 到知识库
 */
export async function uploadMarkdownToWiki(token, spaceId, markdown) {
  const { title, blocks } = markdownToBlocks(markdown);
  const docTitle = generateDocTitle(title || '未命名文档');

  // 1. 创建文档
  const { documentId } = await createDocument(token, docTitle);

  // 2. 添加内容块
  if (blocks.length > 0) {
    await appendBlocks(documentId, token, blocks);
  }

  // 3. 尝试移动到知识库（可能因权限失败）
  try {
    const node = await moveDocToWiki(token, spaceId, documentId, docTitle);
    return {
      documentId,
      nodeToken: node?.node_token,
      title: docTitle,
      url: `https://feishu.cn/wiki/${node?.node_token}`,
    };
  } catch (err) {
    console.log('[Info] 无法移动到知识库，返回云文档链接:', err.message);
    // 返回云文档链接
    return {
      documentId,
      title: docTitle,
      url: `https://feishu.cn/docx/${documentId}`,
    };
  }
}
