import type { ScenarioConfig, StageConfig } from '../../types/scenario';
import type { InterviewTranscript, TranscriptMessage } from '../../types/transcript';
import type { ChatProvider } from '../chat/ChatProvider';
import { InterviewStateMachine, InterviewStage } from './InterviewStateMachine';

/**
 * 采访引擎配置
 */
export interface InterviewEngineConfig {
  scenario: ScenarioConfig;
  chatProvider?: ChatProvider;
  onStageChange?: (stage: InterviewStage) => void;
  onTranscriptUpdate?: (transcript: InterviewTranscript) => void;
}

/**
 * 采访引擎
 * 负责管理采访流程、记录对话、提取信息
 */
export class InterviewEngine {
  private config: InterviewEngineConfig;
  private stateMachine: InterviewStateMachine;
  private transcript: InterviewTranscript;

  constructor(config: InterviewEngineConfig) {
    this.config = config;
    this.stateMachine = new InterviewStateMachine();
    this.transcript = {
      scenarioId: config.scenario.id,
      startTime: new Date(),
      messages: [],
      extractedInfo: {},
    };
  }

  /**
   * 获取当前阶段
   */
  getStage(): InterviewStage {
    return this.stateMachine.getStage();
  }

  /**
   * 获取访谈记录
   */
  getTranscript(): InterviewTranscript {
    return this.transcript;
  }

  /**
   * 开始采访
   */
  start(): void {
    this.stateMachine.start();
    this.config.onStageChange?.(this.stateMachine.getStage());
  }

  /**
   * 获取当前阶段配置
   */
  private getCurrentStageConfig(): StageConfig | undefined {
    const stage = this.stateMachine.getStage();
    return this.config.scenario.stages.find(s => s.id === stage);
  }

  /**
   * 构建当前阶段的系统提示词
   */
  buildSystemPrompt(): string {
    const basePrompt = this.config.scenario.interviewPrompt;
    const stageConfig = this.getCurrentStageConfig();

    if (!stageConfig) {
      return basePrompt;
    }

    return `${basePrompt}

当前阶段：${stageConfig.name}
阶段目标：${stageConfig.prompt}
需要收集的信息：${stageConfig.requiredFields.join('、') || '无特定要求'}`;
  }

  /**
   * 记录用户消息
   */
  addUserMessage(content: string): void {
    const message: TranscriptMessage = {
      role: 'user',
      content,
      timestamp: new Date(),
      stage: this.stateMachine.getStage(),
    };
    this.transcript.messages.push(message);
    this.config.onTranscriptUpdate?.(this.transcript);
  }

  /**
   * 更新最后一条用户消息（用于语音识别实时修正）
   */
  updateLastUserMessage(content: string): void {
    const last = this.transcript.messages[this.transcript.messages.length - 1];
    if (last && last.role === 'user') {
      last.content = content;
      this.config.onTranscriptUpdate?.(this.transcript);
      return;
    }
    this.addUserMessage(content);
  }

  /**
   * 记录助手消息
   */
  addAssistantMessage(content: string): void {
    const message: TranscriptMessage = {
      role: 'assistant',
      content,
      timestamp: new Date(),
      stage: this.stateMachine.getStage(),
    };
    this.transcript.messages.push(message);
    this.config.onTranscriptUpdate?.(this.transcript);
  }

  /**
   * 进入下一阶段
   */
  nextStage(): InterviewStage {
    const stage = this.stateMachine.nextStage();
    this.config.onStageChange?.(stage);
    return stage;
  }

  /**
   * 结束采访
   */
  finish(): InterviewTranscript {
    this.transcript.endTime = new Date();
    this.stateMachine.setStage(InterviewStage.COMPLETED);
    this.config.onStageChange?.(InterviewStage.COMPLETED);
    return this.transcript;
  }

  /**
   * 重置采访
   */
  reset(): void {
    this.stateMachine.reset();
    this.transcript = {
      scenarioId: this.config.scenario.id,
      startTime: new Date(),
      messages: [],
      extractedInfo: {},
    };
  }
}
