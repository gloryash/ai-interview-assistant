import type { ChatProvider, ChatContext, ChatChunk } from './ChatProvider';

/**
 * 阿里百炼 LLM ChatProvider
 * 直接在前端调用阿里云 API
 */
export class DashScopeChatProvider implements ChatProvider {
  private conversationHistory: Array<{ role: string; content: string }> = [];

  constructor(
    private apiKey: string,
    private model: string,
    private systemPrompt: string,
  ) {}

  async sendMessage(
    prompt: string,
    _context: ChatContext,
    signal: AbortSignal,
    onChunk: (chunk: ChatChunk) => void,
  ): Promise<void> {
    this.conversationHistory.push({ role: 'user', content: prompt });

    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...this.conversationHistory,
    ];

    const response = await fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: true,
        }),
        signal,
      },
    );

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            onChunk({ text: '', endpoint: true });
            continue;
          }
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              onChunk({ text: content, endpoint: false });
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    }

    this.conversationHistory.push({ role: 'assistant', content: fullText });
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}
