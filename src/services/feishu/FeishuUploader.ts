/**
 * 飞书上传服务
 */

const FEISHU_SERVER_URL = 'http://localhost:3001';

export interface UploadResult {
  success: boolean;
  documentId?: string;
  nodeToken?: string;
  title?: string;
  url?: string;
  error?: string;
}

/**
 * 检查飞书服务是否可用
 */
export async function checkFeishuServer(): Promise<boolean> {
  try {
    const res = await fetch(`${FEISHU_SERVER_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 上传 Markdown 到飞书知识库
 */
export async function uploadToFeishu(markdown: string): Promise<UploadResult> {
  const res = await fetch(`${FEISHU_SERVER_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown }),
  });

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error || '上传失败' };
  }

  return data;
}
