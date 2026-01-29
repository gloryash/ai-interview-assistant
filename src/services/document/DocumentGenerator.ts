import type { OutputConfig } from '../../types/scenario';
import type { InterviewTranscript, GeneratedDocument } from '../../types/transcript';
import type { ChatProvider, ChatChunk } from '../chat/ChatProvider';

/**
 * 文档生成器配置
 */
export interface DocumentGeneratorConfig {
  chatProvider: ChatProvider;
}

/**
 * 文档生成器
 * 根据访谈记录和产物配置生成文档
 */
export class DocumentGenerator {
  private config: DocumentGeneratorConfig;

  constructor(config: DocumentGeneratorConfig) {
    this.config = config;
  }

  /**
   * 将访谈记录转换为文本
   */
  private transcriptToText(transcript: InterviewTranscript): string {
    return transcript.messages
      .map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`)
      .join('\n\n');
  }

  /**
   * 生成单个文档
   */
  async generateOne(
    transcript: InterviewTranscript,
    outputConfig: OutputConfig,
    signal?: AbortSignal,
    onProgress?: (charCount: number) => void,
  ): Promise<GeneratedDocument> {
    const transcriptText = this.transcriptToText(transcript);

    const prompt = `${outputConfig.generatorPrompt}

以下是访谈记录：
---
${transcriptText}
---

${outputConfig.template ? `请按照以下模板格式输出：\n${outputConfig.template}` : '请生成 Markdown 格式的文档。'}`;

    let content = '';

    await this.config.chatProvider.sendMessage(
      prompt,
      {},
      signal || new AbortController().signal,
      (chunk: ChatChunk) => {
        content += chunk.text;
        onProgress?.(content.length);
      },
    );

    return {
      outputId: outputConfig.id,
      name: outputConfig.name,
      content,
      generatedAt: new Date(),
    };
  }
}
