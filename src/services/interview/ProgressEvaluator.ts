import type { InterviewTranscript } from '../../types/transcript';
import type { ChatProvider, ChatChunk } from '../chat/ChatProvider';
import { REQUIRED_INFO_FIELDS } from '../../config/scenarios/ai-interview';

export const PROGRESS_EVALUATOR_SYSTEM_PROMPT = '你是访谈进度判定员，只输出严格的 JSON，不要解释或添加多余文字。';

const FIELD_GUIDES: Record<string, string> = {
  productName: '产品叫什么名字',
  productDescription: '一句话描述产品是什么/做什么',
  problemToSolve: '具体解决什么用户痛点或问题',
  targetUserGroup: '目标用户是谁/哪类人',
  userAge: '目标用户的年龄段或范围',
  userProfession: '目标用户的职业/背景/身份',
  userPainPoints: '目标用户当前的困难或痛点',
  coreFeatures: '至少一个明确的核心功能',
  usageScenarios: '什么时候、在哪里、在什么场景使用',
  constraints: '时间/预算/技术等限制条件',
  priorities: '最重要/优先的功能或只能做哪几个',
};

const FIELD_IDS = new Set(Object.keys(REQUIRED_INFO_FIELDS));

function transcriptToText(transcript: InterviewTranscript): string {
  return transcript.messages
    .map((m) => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`)
    .join('\n');
}

function buildPrompt(transcript: InterviewTranscript): string {
  const fieldLines = Object.entries(REQUIRED_INFO_FIELDS)
    .map(([id, config]) => `- ${id}: ${config.label}（${FIELD_GUIDES[id] || '请根据标签判断'}）`)
    .join('\n');

  return `请根据访谈记录判断哪些字段已经被用户明确回答。

判定规则：
1. 只依据用户的回答，忽略 AI 引导内容
2. 信息必须明确具体才算已收集
3. 含糊或推测的内容不要算

需要判断的字段：
${fieldLines}

输出 JSON 格式（只输出 JSON）：
{"collected":["fieldId"],"missing":["fieldId"]}

访谈记录：
${transcriptToText(transcript)}`;
}

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

export async function evaluateProgressWithLLM(
  transcript: InterviewTranscript,
  createProvider: () => ChatProvider | undefined,
  signal?: AbortSignal,
): Promise<string[] | null> {
  const provider = createProvider();
  if (!provider) return null;

  const prompt = buildPrompt(transcript);
  const controller = new AbortController();
  const activeSignal = signal || controller.signal;
  let content = '';

  await provider.sendMessage(
    prompt,
    {},
    activeSignal,
    (chunk: ChatChunk) => {
      content += chunk.text;
    },
  );

  const parsed = extractJson(content);
  if (!parsed) return null;
  const collectedRaw = Array.isArray(parsed.collected) ? parsed.collected : [];
  const collected = collectedRaw
    .filter((id): id is string => typeof id === 'string' && FIELD_IDS.has(id));

  return collected.length > 0 ? collected : [];
}
