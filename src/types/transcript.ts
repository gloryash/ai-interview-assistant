/**
 * 访谈消息
 */
export interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  stage?: string;
}

/**
 * 访谈记录
 */
export interface InterviewTranscript {
  scenarioId: string;
  startTime: Date;
  endTime?: Date;
  messages: TranscriptMessage[];
  extractedInfo: Record<string, unknown>;
}

/**
 * 生成的文档
 */
export interface GeneratedDocument {
  outputId: string;
  name: string;
  content: string;
  generatedAt: Date;
}
