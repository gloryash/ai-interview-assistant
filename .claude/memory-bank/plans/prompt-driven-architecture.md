STATUS: APPROVED

# Prompt 驱动的可配置采访架构设计

## 1. 设计目标

- **Prompt 驱动**：通过配置 Prompt 切换场景（访谈/复盘/调研）
- **产物可配置**：用户可定义生成哪些文档
- **流程透明**：每个环节有明确的输入输出
- **架构统一**：不同场景复用同一套代码

## 2. 核心概念

### 2.1 场景配置 (ScenarioConfig)

```typescript
interface ScenarioConfig {
  id: string;                    // 场景ID
  name: string;                  // 场景名称，如"AI访谈"、"复盘会议"
  interviewPrompt: string;       // 采访引导 Prompt
  stages: StageConfig[];         // 采访阶段配置
  outputs: OutputConfig[];       // 产物配置列表
}
```

### 2.2 阶段配置 (StageConfig)

```typescript
interface StageConfig {
  id: string;                    // 阶段ID
  name: string;                  // 阶段名称
  prompt: string;                // 该阶段的引导 Prompt
  requiredFields: string[];      // 该阶段需要收集的信息字段
}
```

### 2.3 产物配置 (OutputConfig)

```typescript
interface OutputConfig {
  id: string;                    // 产物ID
  name: string;                  // 产物名称，如"PRD文档"
  generatorPrompt: string;       // 生成该产物的 Prompt
  template?: string;             // 可选的输出模板
}
```

## 3. 系统架构图

```
┌────────────────────────────────────────────────────────────────┐
│                      场景配置 (ScenarioConfig)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ AI访谈场景   │  │ 复盘场景     │  │ 用户调研场景  │  ...     │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────┬───────────────────────────────────┘
                             │ 选择场景
                             ▼
┌────────────────────────────────────────────────────────────────┐
│  Layer 1: 语音交互层 (已有，复用)                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  VoiceChatEngine: ASR + TTS + VAD                       │  │
│  │  输入: 用户语音                                          │  │
│  │  输出: 实时文字流                                        │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────┬───────────────────────────────────┘
                             │ 文字流
                             ▼
┌────────────────────────────────────────────────────────────────┐
│  Layer 2: 采访引擎层 (新增)                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  InterviewEngine                                        │  │
│  │  - 加载场景的 interviewPrompt + stages                  │  │
│  │  - 管理采访状态机（阶段推进）                             │  │
│  │  - 实时记录对话（生成逐字稿）                             │  │
│  │  输入: 文字 + ScenarioConfig                            │  │
│  │  输出: InterviewTranscript (访谈记录)                   │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────┬───────────────────────────────────┘
                             │ 访谈记录
                             ▼
┌────────────────────────────────────────────────────────────────┐
│  Layer 3: 文档生成层 (新增)                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  DocumentGenerator                                      │  │
│  │  - 读取场景的 outputs 配置                               │  │
│  │  - 并行调用 LLM 生成各个产物                             │  │
│  │  输入: InterviewTranscript + OutputConfig[]             │  │
│  │  输出: GeneratedDocument[]                              │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

## 4. 核心数据结构

### 4.1 访谈记录 (InterviewTranscript)

```typescript
interface InterviewTranscript {
  scenarioId: string;            // 使用的场景ID
  startTime: Date;               // 开始时间
  endTime?: Date;                // 结束时间
  messages: TranscriptMessage[]; // 对话消息列表
  extractedInfo: Record<string, any>; // 提取的结构化信息
}

interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  stage?: string;                // 所属阶段
}
```

### 4.2 生成的文档 (GeneratedDocument)

```typescript
interface GeneratedDocument {
  outputId: string;              // 对应的产物配置ID
  name: string;                  // 文档名称
  content: string;               // 文档内容 (Markdown)
  generatedAt: Date;             // 生成时间
}
```

## 5. 文件结构

```
src/
├── services/
│   ├── interview/                    # 新增：采访引擎
│   │   ├── InterviewEngine.ts        # 采访引擎核心
│   │   ├── InterviewStateMachine.ts  # 采访状态机
│   │   └── InfoExtractor.ts          # 信息提取器
│   │
│   └── document/                     # 新增：文档生成
│       └── DocumentGenerator.ts      # 文档生成器
│
├── config/
│   └── scenarios/                    # 新增：场景配置
│       ├── index.ts                  # 场景配置入口
│       ├── ai-interview.ts           # AI访谈场景
│       └── retrospective.ts          # 复盘场景
│
├── types/
│   ├── scenario.ts                   # 新增：场景相关类型
│   └── transcript.ts                 # 新增：访谈记录类型
│
└── hooks/
    └── useInterview.ts               # 新增：采访Hook
```

## 6. 场景配置示例

### 6.1 AI访谈场景

```typescript
// config/scenarios/ai-interview.ts
export const aiInterviewScenario: ScenarioConfig = {
  id: 'ai-interview',
  name: 'AI 产品访谈',
  interviewPrompt: `你是一位专业的产品经理，正在采访用户了解他们的产品想法。
你的目标是通过提问，帮助用户梳理清楚他们想要做什么产品。
请按照阶段逐步引导，每次只问1-2个问题，不要一次问太多。`,

  stages: [
    {
      id: 'opening',
      name: '开场',
      prompt: '友好地打招呼，简单介绍采访流程',
      requiredFields: []
    },
    {
      id: 'vision',
      name: '产品愿景',
      prompt: '了解用户想做什么产品，解决什么问题',
      requiredFields: ['productName', 'problemToSolve']
    },
    // ... 更多阶段
  ],

  outputs: [
    {
      id: 'prd',
      name: 'PRD文档',
      generatorPrompt: '基于访谈记录，生成一份完整的PRD文档...'
    },
    {
      id: 'user-persona',
      name: '用户画像',
      generatorPrompt: '基于访谈记录，提炼用户画像...'
    }
  ]
};
```

## 7. 实施步骤

### Step 1: 定义类型
- [x] 创建 `types/scenario.ts` - 场景配置类型
- [x] 创建 `types/transcript.ts` - 访谈记录类型

### Step 2: 实现采访引擎
- [x] 创建 `InterviewEngine.ts` - 核心引擎
- [x] 创建 `InterviewStateMachine.ts` - 状态机
- [ ] 创建 `InfoExtractor.ts` - 信息提取（暂未实现，可后续添加）

### Step 3: 实现文档生成器
- [x] 创建 `DocumentGenerator.ts` - 并行生成文档

### Step 4: 创建场景配置
- [x] 创建 AI访谈场景配置
- [ ] 创建复盘场景配置（示例）（可后续添加）

### Step 5: 集成到UI
- [x] 创建 `useInterview.ts` Hook
- [x] 修改 UI 支持场景选择
- [x] 添加访谈记录预览
- [x] 添加文档生成和导出

## 8. 影响分析

### 复用的模块（不修改）
- 语音交互层：ASR、TTS、VAD、AudioPlayer、AudioRecorder
- ChatProvider 接口

### 新增的模块
- InterviewEngine（采访引擎）
- DocumentGenerator（文档生成器）
- 场景配置系统

### 修改的模块
- UI 组件：添加场景选择、访谈记录预览、文档导出
