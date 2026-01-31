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
 * 信息收集进度项
 */
export interface InfoProgressItem {
  id: string;
  label: string;
  weight: number;
  collected: boolean;
}

/**
 * 信息收集进度
 */
export interface InfoProgress {
  items: InfoProgressItem[];
  percentage: number;
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
