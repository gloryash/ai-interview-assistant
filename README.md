# AI 访谈助手 (AI Interview Assistant)

一个基于语音对话的 AI 访谈应用，通过自然对话帮助用户将想法转化为结构化文档。

## 功能介绍

### 两种访谈场景

| 场景 | 说明 | 生成文档 |
|------|------|----------|
| **AI 产品访谈** | AI 引导你描述产品想法，自动生成需求文档 | PRD、用户画像 |
| **AI 复盘** | AI 引导你回顾一天的经历，生成复盘记录 | 复盘文档 |

### 核心特性

- **语音对话** - 像聊天一样说话，AI 自动识别并回复
- **语音打断** - 随时打断 AI 说话，继续你的表达
- **实时进度** - 显示信息收集进度（AI产品访谈场景）
- **自动生成文档** - 访谈结束后一键生成结构化文档
- **飞书上传** - 一键上传文档到飞书云空间

---

## 快速开始

### 第一步：安装依赖

```bash
npm install
```

### 第二步：启动应用

```bash
npm run dev
```

浏览器会自动打开 http://localhost:5173

### 第三步：配置 API Key

1. 首次打开会弹出设置面板
2. 填入你的**阿里百炼 API Key**（[获取地址](https://bailian.console.aliyun.com/)）
3. 点击保存

### 第四步：开始访谈

1. 选择访谈场景（AI产品访谈 / AI复盘）
2. 点击「开始」按钮
3. 对着麦克风说话，AI 会自动回应
4. 访谈结束后点击「结束」
5. 点击「生成文档」获取结构化文档

---

## 飞书上传功能（可选）

如果你想把生成的文档上传到飞书，需要额外配置：

### 1. 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn)
2. 创建一个企业自建应用
3. 在「权限管理」中开启以下权限：
   - `docx:document` - 查看、编辑和管理云文档
   - `wiki:wiki` - 查看、编辑和管理知识库（可选）
4. 发布应用

### 2. 配置飞书凭证

复制配置文件模板：

```bash
cp feishu.config.example.json feishu.config.json
```

编辑 `feishu.config.json`，填入你的应用信息：

```json
{
  "appId": "你的应用ID",
  "appSecret": "你的应用密钥",
  "spaceId": "知识库空间ID（可选）"
}
```

### 3. 启动飞书服务

```bash
npm run feishu
```

### 4. 上传文档

生成文档后，点击「上传飞书」按钮即可。

---

## 设置说明

点击右上角齿轮图标打开设置面板：

| 设置项 | 说明 | 推荐值 |
|--------|------|--------|
| API Key | 阿里百炼 API Key | 必填 |
| LLM 模型 | AI 对话模型 | qwen-plus |
| TTS 语音 | AI 说话的声音 | 根据喜好选择 |
| 语音打断 | 是否允许打断 AI 说话 | 开启 |

---

## 常见问题

### Q: 麦克风没有声音？

1. 确保浏览器已授权麦克风权限
2. 检查系统麦克风设置
3. 使用 Chrome 浏览器效果最佳

### Q: API Key 在哪里获取？

1. 访问 [阿里云百炼](https://bailian.console.aliyun.com/)
2. 注册/登录账号
3. 在控制台创建 API Key

### Q: 飞书上传失败？

1. 确保飞书服务已启动（`npm run feishu`）
2. 检查 `feishu.config.json` 配置是否正确
3. 确保应用权限已开启

### Q: 支持哪些浏览器？

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 66+ |
| Edge | 79+ |
| Firefox | 76+ |
| Safari | 14.1+ |

---

## 项目结构

```
├── src/                    # 前端源码
│   ├── components/         # UI 组件
│   ├── hooks/              # React Hooks
│   ├── services/           # 服务层（ASR/TTS/LLM）
│   ├── config/scenarios/   # 访谈场景配置
│   └── stores/             # 状态管理
├── server/                 # 后端服务
│   └── feishu/             # 飞书上传服务
├── public/                 # 静态资源
│   └── workers/            # Web Workers
├── docs/                   # 项目文档
└── feishu.config.json      # 飞书配置（需自行创建）
```

---

## 开发命令

```bash
# 启动开发服务器
npm run dev

# 启动飞书上传服务
npm run feishu

# 构建生产版本
npm run build

# 代码检查
npm run lint
```

---

## 技术栈

- **前端**: React 19 + TypeScript + Vite 7
- **语音识别**: 阿里云 Paraformer (WebSocket)
- **语音合成**: 阿里云 CosyVoice
- **AI 对话**: 阿里云通义千问
- **飞书集成**: 飞书开放 API

---

## 文档

详细文档请查看 `docs/` 目录：

- [用户画像](docs/01-用户画像.md)
- [产品需求文档](docs/02-产品需求文档.md)
- [模块设计文档](docs/03-模块设计文档.md)
- [场景扩展指南](docs/06-场景扩展指南.md)

---

## License

MIT
