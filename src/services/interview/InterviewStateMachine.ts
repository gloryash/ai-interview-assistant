/**
 * 采访阶段状态
 * 复用 VoiceStateMachine 的枚举模式
 */
export enum InterviewStage {
  NOT_STARTED = 'not_started',
  OPENING = 'opening',
  PRODUCT_VISION = 'product_vision',
  TARGET_USERS = 'target_users',
  CORE_FEATURES = 'core_features',
  USER_SCENARIOS = 'user_scenarios',
  CONSTRAINTS = 'constraints',
  PRIORITIES = 'priorities',
  SUMMARY = 'summary',
  COMPLETED = 'completed',
}

/**
 * 采访状态机
 */
export class InterviewStateMachine {
  private currentStage: InterviewStage = InterviewStage.NOT_STARTED;
  private stageOrder: InterviewStage[];

  constructor(stages?: InterviewStage[]) {
    this.stageOrder = stages || [
      InterviewStage.OPENING,
      InterviewStage.PRODUCT_VISION,
      InterviewStage.TARGET_USERS,
      InterviewStage.CORE_FEATURES,
      InterviewStage.USER_SCENARIOS,
      InterviewStage.CONSTRAINTS,
      InterviewStage.PRIORITIES,
      InterviewStage.SUMMARY,
    ];
  }

  getStage(): InterviewStage {
    return this.currentStage;
  }

  setStage(stage: InterviewStage): void {
    this.currentStage = stage;
  }

  start(): void {
    if (this.stageOrder.length > 0) {
      this.currentStage = this.stageOrder[0];
    }
  }

  nextStage(): InterviewStage {
    const currentIndex = this.stageOrder.indexOf(this.currentStage);
    if (currentIndex < this.stageOrder.length - 1) {
      this.currentStage = this.stageOrder[currentIndex + 1];
    } else {
      this.currentStage = InterviewStage.COMPLETED;
    }
    return this.currentStage;
  }

  isCompleted(): boolean {
    return this.currentStage === InterviewStage.COMPLETED;
  }

  reset(): void {
    this.currentStage = InterviewStage.NOT_STARTED;
  }
}
