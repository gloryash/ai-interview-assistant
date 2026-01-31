import type { ScenarioConfig } from '../../types/scenario';

/**
 * 需要收集的信息字段定义
 */
export const REQUIRED_INFO_FIELDS = {
  // 产品愿景
  productName: { label: '产品名称', weight: 10 },
  productDescription: { label: '产品描述', weight: 10 },
  problemToSolve: { label: '解决的问题', weight: 15 },

  // 目标用户
  targetUserGroup: { label: '目标用户群体', weight: 10 },
  userAge: { label: '用户年龄段', weight: 5 },
  userProfession: { label: '用户职业/背景', weight: 5 },
  userPainPoints: { label: '用户痛点', weight: 10 },

  // 核心功能
  coreFeatures: { label: '核心功能列表', weight: 15 },

  // 使用场景
  usageScenarios: { label: '使用场景', weight: 10 },

  // 约束条件
  constraints: { label: '约束条件', weight: 5 },

  // 优先级
  priorities: { label: '功能优先级', weight: 5 },
};

/**
 * AI 产品访谈场景配置
 */
export const aiInterviewScenario: ScenarioConfig = {
  id: 'ai-interview',
  name: 'AI 产品访谈',

  interviewPrompt: `你是一位专业且友善的产品经理，正在通过语音采访帮助用户梳理产品想法。

## 核心任务
你的目标是收集足够详细的信息来生成高质量的 PRD 和用户画像文档。必须收集以下信息：

### 必须收集的信息清单
1. 【产品名称】- 产品叫什么名字
2. 【产品描述】- 一句话描述产品是什么
3. 【解决的问题】- 具体解决用户什么痛点
4. 【目标用户】- 谁会用这个产品（年龄、职业、背景）
5. 【用户痛点】- 目标用户现在遇到什么困难
6. 【核心功能】- 产品必须有哪些功能（至少3个具体功能）
7. 【使用场景】- 用户在什么情况下会使用（时间、地点、场景）
8. 【约束条件】- 有什么限制（时间、预算、技术）
9. 【优先级】- 如果只能做3个功能，选哪些

## 采访原则

### 追问原则（重要）
- 如果用户回答模糊，必须追问具体细节
- 不接受"都可以"、"随便"、"不知道"这类回答，要引导用户思考
- 每个关键信息都要追问到具体、可执行的程度
- 用"比如说"、"能举个例子吗"、"具体是指"来引导

### 追问示例
- 用户说"帮助用户学习" → 追问"学习什么内容？编程、语言还是其他？"
- 用户说"年轻人" → 追问"大概什么年龄段？18-25岁还是25-35岁？"
- 用户说"功能要全" → 追问"能说3个你觉得最重要的功能吗？"

### 对话风格
1. 每次只问 1 个问题，等用户回答后再问下一个
2. 用简短口语化表达，适合语音对话（每次回复 2-3 句话）
3. 先简短确认用户说的内容，再追问或进入下一个话题
4. 不要使用 markdown 格式
5. 禁止使用任何表情符号

## 采访流程
严格按以下顺序，每个阶段都要收集到具体信息才能进入下一阶段：

1. 【开场】打招呼，问用户想做什么产品
2. 【产品愿景】产品名称、一句话描述、解决什么问题
3. 【目标用户】用户是谁、年龄职业、他们的痛点
4. 【核心功能】必须有哪些功能，每个功能具体做什么
5. 【使用场景】什么时候、在哪里、怎么使用
6. 【约束条件】时间、预算、技术限制
7. 【优先级】最重要的3个功能是什么
8. 【总结确认】复述收集到的信息，确认是否正确

## 开场
用户刚进入采访，请友好地打招呼，然后问：你想做一个什么样的产品？能先给它起个名字，再用一句话描述一下吗？`,

  stages: [
    {
      id: 'opening',
      name: '开场',
      prompt: '友好地打招呼，简单介绍采访流程，让用户放松',
      requiredFields: [],
    },
    {
      id: 'product_vision',
      name: '产品愿景',
      prompt: '了解用户想做什么产品，解决什么问题',
      requiredFields: ['productName', 'problemToSolve'],
    },
    {
      id: 'target_users',
      name: '目标用户',
      prompt: '明确目标用户是谁，他们有什么特点',
      requiredFields: ['targetUsers', 'userCharacteristics'],
    },
    {
      id: 'core_features',
      name: '核心功能',
      prompt: '梳理产品必须有哪些功能',
      requiredFields: ['coreFeatures'],
    },
    {
      id: 'user_scenarios',
      name: '使用场景',
      prompt: '描述用户会在什么场景下使用产品',
      requiredFields: ['userScenarios'],
    },
    {
      id: 'constraints',
      name: '约束条件',
      prompt: '了解技术、时间、资源等限制',
      requiredFields: ['constraints'],
    },
    {
      id: 'priorities',
      name: '优先级',
      prompt: '确认功能优先级，如果只能做3个功能选哪些',
      requiredFields: ['priorities'],
    },
    {
      id: 'summary',
      name: '总结确认',
      prompt: '总结收集到的信息，与用户确认',
      requiredFields: [],
    },
  ],

  outputs: [
    {
      id: 'prd',
      name: 'PRD文档',
      generatorPrompt: `你是一位资深产品经理，请基于以下访谈记录生成一份专业的 PRD 文档。

## 输出要求
- 使用 Markdown 格式
- 语言专业但易懂
- 信息要具体，避免空泛描述
- 如果访谈中某些信息不完整，标注"待补充"

## PRD 结构
1. 产品概述（产品名称、一句话描述、核心价值）
2. 产品背景（痛点分析、市场机会）
3. 目标用户（用户画像、用户特征）
4. 核心功能（功能列表、优先级）
5. 使用场景（典型场景描述）
6. 约束条件（技术限制、资源限制、时间限制）
7. 成功指标（可量化的目标）`,
    },
    {
      id: 'user-persona',
      name: '用户画像',
      generatorPrompt: `你是一位用户研究专家，请基于以下访谈记录提炼用户画像文档。

## 输出要求
- 使用 Markdown 格式
- 用户画像要具体鲜活，像描述一个真实的人
- 包含具体的姓名、年龄、职业等细节

## 用户画像结构
1. 基本信息（姓名、年龄、职业、背景）
2. 用户特征（性格、习惯、技术水平）
3. 痛点与需求（当前困扰、期望解决的问题）
4. 使用目标（想通过产品达成什么）
5. 典型场景（什么时候、在哪里、怎么使用）
6. 关键引述（访谈中的原话摘录）`,
    },
  ],
};
