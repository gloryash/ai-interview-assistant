import type { ChatProvider, ChatContext, ChatChunk } from './ChatProvider';

const DEFAULT_BASE_URL = import.meta.env.VITE_CLAUDE_BASE_URL || 'https://code.newcli.com/claude/droid';
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_VERSION = '2023-06-01';
const MESSAGES_PATH = '/v1/messages';

type StreamDelta = {
  text: string;
  done: boolean;
};

function extractStreamDelta(payload: unknown): StreamDelta {
  if (!payload || typeof payload !== 'object') return { text: '', done: false };

  const data = payload as Record<string, any>;
  if (data.type === 'message_stop' || data.type === 'content_block_stop') {
    return { text: '', done: true };
  }

  if (data.type === 'content_block_delta' && typeof data.delta?.text === 'string') {
    return { text: data.delta.text, done: false };
  }

  if (typeof data.delta?.text === 'string') {
    return { text: data.delta.text, done: false };
  }

  if (typeof data.completion === 'string') {
    return { text: data.completion, done: false };
  }

  const openAiText = data.choices?.[0]?.delta?.content;
  if (typeof openAiText === 'string') {
    return { text: openAiText, done: false };
  }

  if (Array.isArray(data.content)) {
    const text = data.content
      .map((block) => (typeof block?.text === 'string' ? block.text : ''))
      .join('');
    if (text) return { text, done: false };
  }

  return { text: '', done: false };
}

/**
 * Claude Code ChatProvider
 * Calls Claude-compatible streaming API directly from the browser.
 */
export class ClaudeCodeChatProvider implements ChatProvider {
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor(
    private apiKey: string,
    private model: string,
    private systemPrompt: string,
    private baseUrl: string = DEFAULT_BASE_URL,
  ) {}

  async sendMessage(
    prompt: string,
    _context: ChatContext,
    signal: AbortSignal,
    onChunk: (chunk: ChatChunk) => void,
  ): Promise<void> {
    this.conversationHistory.push({ role: 'user', content: prompt });

    const messages = this.conversationHistory.map((message) => ({
      role: message.role,
      content: [{ type: 'text', text: message.content }],
    }));

    const body: Record<string, unknown> = {
      max_tokens: DEFAULT_MAX_TOKENS,
      system: this.systemPrompt,
      messages,
      stream: true,
    };

    if (this.model.trim()) {
      body.model = this.model;
    }

    const url = this.baseUrl.includes(MESSAGES_PATH)
      ? this.baseUrl
      : `${this.baseUrl.replace(/\/+$/, '')}${MESSAGES_PATH}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': DEFAULT_VERSION,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`LLM request failed: ${response.status} ${errorText}`.trim());
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const payload = await response.json();
      const contentBlocks = Array.isArray(payload?.content) ? payload.content : [];
      const text = contentBlocks
        .map((block: { text?: string }) => (typeof block?.text === 'string' ? block.text : ''))
        .join('');
      if (text) {
        onChunk({ text, endpoint: true });
      } else {
        onChunk({ text: '', endpoint: true });
      }
      this.conversationHistory.push({ role: 'assistant', content: text });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    let finished = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || !line.startsWith('data:')) continue;

        const data = line.slice(5).trim();
        if (!data) continue;

        if (data === '[DONE]') {
          if (!finished) onChunk({ text: '', endpoint: true });
          finished = true;
          continue;
        }

        try {
          const json = JSON.parse(data);
          const { text, done: isDone } = extractStreamDelta(json);
          if (text) {
            fullText += text;
            onChunk({ text, endpoint: false });
          }
          if (isDone && !finished) {
            onChunk({ text: '', endpoint: true });
            finished = true;
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    this.conversationHistory.push({ role: 'assistant', content: fullText });
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}
