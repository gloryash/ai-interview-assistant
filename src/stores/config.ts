/**
 * 应用配置接口
 */
export interface AppConfig {
  // 阿里百炼 API Key
  apiKey: string;
  // LLM 模型
  llmModel: string;
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
  };
}

const STORAGE_KEY = 'voice-chat-config';

const DEFAULT_CONFIG: AppConfig = {
  apiKey: 'sk-ece511253bb94ad98c53dbe8e81cc9e3',
  llmModel: 'qwen-plus',
  voiceId: 'longxiaochun',
  systemPrompt: '你是一个友好的AI助手，请用简洁的语言回答用户的问题。',
  voiceDisturbEnabled: true,
};

export function loadConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
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
