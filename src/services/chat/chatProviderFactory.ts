import type { LLMProvider } from '../../types/llm';
import type { ChatProvider } from './ChatProvider';
import { ClaudeCodeChatProvider } from './ClaudeCodeChatProvider';
import { DashScopeChatProvider } from './DashScopeChatProvider';

interface ChatProviderFactoryConfig {
  provider: LLMProvider;
  model: string;
  systemPrompt: string;
  claudeApiKey: string;
  dashscopeApiKey: string;
}

export function createChatProvider(config: ChatProviderFactoryConfig): ChatProvider | undefined {
  const { provider, model, systemPrompt, claudeApiKey, dashscopeApiKey } = config;

  if (provider === 'claude') {
    if (!claudeApiKey) return undefined;
    return new ClaudeCodeChatProvider(claudeApiKey, model, systemPrompt);
  }

  if (!dashscopeApiKey) return undefined;
  return new DashScopeChatProvider(dashscopeApiKey, model, systemPrompt);
}
