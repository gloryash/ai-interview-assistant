export interface ChatContext {
  memoryPrompt?: string[];
  [key: string]: unknown;
}

export interface ChatChunk {
  text: string;
  endpoint: boolean;
}

export interface ChatProvider {
  sendMessage(
    prompt: string,
    context: ChatContext,
    signal: AbortSignal,
    onChunk: (chunk: ChatChunk) => void,
  ): Promise<void>;
}
