# AI 采访助手

通过 AI 语音采访，帮助用户将模糊的 idea 转化为详尽的 PRD 文档。

## 特性

- 纯语音对话（语音输入 + 语音输出）
- AI 主动引导采访流程
- 实时信息提取和 PRD 预览
- 5-10 分钟完成需求梳理

## 目标用户

13-17 岁营地学员，包括技术小白和编程高手。

## 技术栈

- 前端：纯 HTML/CSS/JS (ES Module)
- 语音：阿里云 DashScope (ASR + TTS)
- AI：通义千问 (qwen-turbo/plus)

## 快速开始

```bash
# 启动本地服务器
python3 -m http.server 8080

# 访问采访页面
open http://localhost:8080/interview.html
```

## 文档

- [PRD 文档](./prd.md)
