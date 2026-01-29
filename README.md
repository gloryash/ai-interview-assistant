# AI 访谈助手 (AI Interview Assistant)

一个基于 React + TypeScript 的 AI 语音访谈应用，通过语音对话帮助用户将模糊的想法转化为结构化文档。

## 核心特性

- **语音对话** - 实时语音识别 + 语音合成 + 语音打断
- **AI 引导访谈** - AI 主动提问，引导用户表达需求
- **多场景支持** - Prompt 驱动架构，一套代码支持多种访谈场景
- **自动生成文档** - 访谈结束后自动生成 PRD、用户画像等文档

## 功能特性

- **实时语音识别 (ASR)** - 使用阿里云 Paraformer 实时语音识别
- **语音合成 (TTS)** - 使用阿里云 CosyVoice 语音合成
- **语音活动检测 (VAD)** - 自动检测用户说话开始和结束
- **语音打断** - 用户说话时自动停止 AI 回复
- **场景切换** - 支持多种访谈场景（产品访谈、助教复盘等）
- **文档生成** - 自动生成 PRD、用户画像等结构化文档
- **文档导出** - 支持 Markdown 格式导出

## 技术栈

- React 19 + TypeScript
- Vite 7
- Web Audio API (AudioWorklet)
- WebSocket (实时通信)
- 阿里云 DashScope API

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 配置说明

首次运行时会弹出设置面板，需要配置：

| 配置项 | 说明 |
|--------|------|
| API Key | 阿里百炼 API Key |
| LLM 模型 | qwen-plus / qwen-turbo / qwen-max |
| TTS 语音 | 龙小淳 / 龙婉 / 龙悦 / Stella |
| 系统人设 | LLM 的系统提示词 |
| 语音打断 | 是否启用语音打断功能 |

## 项目结构

```
src/
├── components/          # UI 组件
│   ├── CenterChat.tsx   # 中间对话面板
│   ├── ChatHistory.tsx  # 右侧对话记录
│   └── SettingsPanel.tsx # 设置面板
├── hooks/               # React Hooks
│   ├── useRealtimeVoiceChat.ts  # 主要对话逻辑
│   ├── useVoiceInteraction.ts   # 语音交互
│   ├── useAudioRecorder.ts      # 录音
│   ├── useAudioPlayer.ts        # 播放
│   ├── useASR.ts                # 语音识别
│   └── useTTS.ts                # 语音合成
├── services/            # 服务层
│   ├── audio/           # 音频处理
│   ├── asr/             # ASR 服务
│   ├── tts/             # TTS 服务
│   ├── chat/            # LLM 对话
│   └── voice/           # VAD 等
├── stores/              # 状态管理
└── types/               # TypeScript 类型
public/
├── workers/             # Web Workers
│   ├── audioProcessor.js    # 录音处理
│   ├── pcmPlayerWorklet.js  # 播放处理
│   └── asrWorker.js         # ASR Worker
└── js/
    └── paraformerRealtimeApi.js  # ASR API
```

## 浏览器兼容性

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 66+ |
| Firefox | 76+ |
| Safari | 14.1+ |
| Edge | 79+ |

## 注意事项

- 需要 HTTPS 或 localhost 环境（麦克风权限要求）
- 需要用户授权麦克风权限
- 依赖网络连接（调用云端 API）

## 文档

详细文档请查看 `docs/` 目录：

### 产品文档
- [用户画像](docs/01-用户画像.md)
- [产品需求文档](docs/02-产品需求文档.md)

### 技术文档
- [模块设计文档](docs/03-模块设计文档.md)
- [系统架构图](docs/04-系统架构图.md)
- [Prompt驱动架构设计](docs/05-Prompt驱动架构设计.md)

### 扩展指南
- [场景扩展指南](docs/06-场景扩展指南.md) - 如何添加新的访谈场景
- [文档生成机制](docs/07-文档生成机制.md) - 文档生成原理
- [项目自身PRD](docs/08-项目自身PRD.md) - 本项目的PRD

## License

MIT
