import type { LLMProvider } from '../types/llm';

/**
 * 应用配置接口
 */
export interface AppConfig {
  // Claude API Key
  claudeApiKey: string;
  // 阿里云 DashScope API Key（同时用于 ASR/TTS）
  dashscopeApiKey: string;
  // 采访 Agent LLM 配置
  interviewProvider: LLMProvider;
  interviewModel: string;
  // PRD 文档 Agent LLM 配置
  prdProvider: LLMProvider;
  prdModel: string;
  // 用户画像 Agent LLM 配置
  personaProvider: LLMProvider;
  personaModel: string;
  // TTS 语音 ID
  voiceId: string;
  // 系统人设
  systemPrompt: string;
  // 是否启用语音打断
  voiceDisturbEnabled: boolean;
  // 场景配置
  scenarioPrompts?: {
    interviewPrompt?: string;
    prdPrompt?: string;
    personaPrompt?: string;
    reflectionPrompt?: string;
    reflectionReportPrompt?: string;
  };
}

const STORAGE_KEY = 'voice-chat-config';
const DEFAULT_PROVIDER: LLMProvider = 'claude';
const DEFAULT_CLAUDE_MODEL = 'claude-opus-4-5-20251101';
const ENV_CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY || '';
const ENV_DASHSCOPE_API_KEY = import.meta.env.VITE_DASHSCOPE_API_KEY || '';

const DEFAULT_CONFIG: AppConfig = {
  claudeApiKey: ENV_CLAUDE_API_KEY,
  dashscopeApiKey: ENV_DASHSCOPE_API_KEY,
  interviewProvider: DEFAULT_PROVIDER,
  interviewModel: DEFAULT_CLAUDE_MODEL,
  prdProvider: DEFAULT_PROVIDER,
  prdModel: DEFAULT_CLAUDE_MODEL,
  personaProvider: DEFAULT_PROVIDER,
  personaModel: DEFAULT_CLAUDE_MODEL,
  voiceId: 'longxiaochun',
  systemPrompt: '你是一个友好的AI助手，请用简洁的语言回答用户的问题。',
  voiceDisturbEnabled: true,
};

export function loadConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const storedConfig = JSON.parse(stored) as Partial<AppConfig> & {
        apiKey?: string;
        llmModel?: string;
      };
      const { apiKey: legacyApiKey, llmModel: legacyModel, ...rest } = storedConfig;
      const legacyProvider: LLMProvider | undefined = legacyModel
        ? legacyModel.startsWith('claude-')
          ? 'claude'
          : 'dashscope'
        : undefined;

      const migrated: Partial<AppConfig> = {};
      if (!rest.claudeApiKey && !rest.dashscopeApiKey && legacyApiKey) {
        if (legacyProvider === 'claude') {
          migrated.claudeApiKey = legacyApiKey;
        } else {
          migrated.dashscopeApiKey = legacyApiKey;
        }
      }

      if (legacyModel) {
        if (!rest.interviewModel) migrated.interviewModel = legacyModel;
        if (!rest.prdModel) migrated.prdModel = legacyModel;
        if (!rest.personaModel) migrated.personaModel = legacyModel;
      }

      if (legacyProvider) {
        if (!rest.interviewProvider) migrated.interviewProvider = legacyProvider;
        if (!rest.prdProvider) migrated.prdProvider = legacyProvider;
        if (!rest.personaProvider) migrated.personaProvider = legacyProvider;
      }

      const merged = { ...DEFAULT_CONFIG, ...rest, ...migrated };
      if (!merged.claudeApiKey && ENV_CLAUDE_API_KEY) {
        merged.claudeApiKey = ENV_CLAUDE_API_KEY;
      }
      if (!merged.dashscopeApiKey && ENV_DASHSCOPE_API_KEY) {
        merged.dashscopeApiKey = ENV_DASHSCOPE_API_KEY;
      }
      return merged;
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}
