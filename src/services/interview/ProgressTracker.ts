import type { InfoProgress, InfoProgressItem, TranscriptMessage } from '../../types/transcript';
import { REQUIRED_INFO_FIELDS } from '../../config/scenarios/ai-interview';

/**
 * 信息检测关键词映射
 */
const INFO_DETECTION_PATTERNS: Record<string, RegExp[]> = {
  productName: [
    /叫[做作]?[「"']?(.+?)[」"']?[，。,\.]/,
    /名[字称].*?[是叫][「"']?(.+?)[」"'，。]/,
    /产品.*?[「"'](.+?)[」"']/,
  ],
  productDescription: [
    /是一[个款种].*?[的地]?(产品|应用|工具|平台|系统)/,
    /用来.{5,}/,
    /可以.{5,}/,
    /帮助.{5,}/,
  ],
  problemToSolve: [
    /解决.*?(问题|痛点|困难|麻烦)/,
    /痛点.*?是/,
    /困扰.*?是/,
    /问题.*?是/,
  ],
  targetUserGroup: [
    /(用户|人群|群体|对象).*?是/,
    /面向.*?(用户|人群|群体)/,
    /给.*?(用|使用)/,
    /(学生|上班族|程序员|设计师|老师|医生|企业|公司)/,
  ],
  userAge: [
    /(\d+).*?岁/,
    /(年轻人|中年人|老年人|青少年|儿童|成年人)/,
    /(\d+)-(\d+)岁/,
  ],
  userProfession: [
    /(职业|工作|行业).*?是/,
    /(学生|上班族|程序员|设计师|老师|医生|自由职业|创业者)/,
  ],
  userPainPoints: [
    /(痛点|困难|问题|麻烦|困扰|烦恼)/,
    /不方便/,
    /很难/,
    /没有.*?好的/,
  ],
  coreFeatures: [
    /(功能|特性|能力).*?(有|包括|是)/,
    /可以.*?(做|实现|完成)/,
    /支持.*?(功能|操作)/,
    /(第一|第二|第三|首先|其次|然后|还有)/,
  ],
  usageScenarios: [
    /(场景|情况|时候).*?(使用|用)/,
    /在.*?(时|的时候)/,
    /(上班|下班|通勤|睡前|早上|晚上|周末)/,
  ],
  constraints: [
    /(限制|约束|条件|要求)/,
    /(预算|时间|资源|技术)/,
    /(不能|不可以|必须|一定要)/,
  ],
  priorities: [
    /(优先|重要|先做|必须有)/,
    /(第一|最重要|核心|关键)/,
    /如果只能.*?选/,
  ],
};

/**
 * 进度追踪器
 */
export class ProgressTracker {
  private collectedInfo: Set<string> = new Set();

  /**
   * 分析消息并更新进度
   */
  analyzeMessages(messages: TranscriptMessage[]): InfoProgress {
    // 只分析用户消息
    const userMessages = messages.filter(m => m.role === 'user');
    const allUserText = userMessages.map(m => m.content).join(' ');

    // 检测每个字段是否已收集
    for (const [fieldId, patterns] of Object.entries(INFO_DETECTION_PATTERNS)) {
      if (this.collectedInfo.has(fieldId)) continue;

      for (const pattern of patterns) {
        if (pattern.test(allUserText)) {
          this.collectedInfo.add(fieldId);
          break;
        }
      }
    }

    return this.getProgress();
  }

  /**
   * 获取当前进度
   */
  getProgress(): InfoProgress {
    const items: InfoProgressItem[] = [];
    let totalWeight = 0;
    let collectedWeight = 0;

    for (const [id, config] of Object.entries(REQUIRED_INFO_FIELDS)) {
      const collected = this.collectedInfo.has(id);
      items.push({
        id,
        label: config.label,
        weight: config.weight,
        collected,
      });
      totalWeight += config.weight;
      if (collected) {
        collectedWeight += config.weight;
      }
    }

    const percentage = totalWeight > 0
      ? Math.round((collectedWeight / totalWeight) * 100)
      : 0;

    return { items, percentage };
  }

  /**
   * 手动标记某个字段已收集
   */
  markCollected(fieldId: string): void {
    this.collectedInfo.add(fieldId);
  }

  /**
   * 重置进度
   */
  reset(): void {
    this.collectedInfo.clear();
  }
}
