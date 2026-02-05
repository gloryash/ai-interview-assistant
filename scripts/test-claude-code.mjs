#!/usr/bin/env node
/* eslint-disable no-console */

const baseUrl = process.env.CLAUDE_CODE_BASE_URL || 'https://code.newcli.com/claude/droid';
const messagesPath = '/v1/messages';
const apiKey = process.env.CLAUDE_CODE_API_KEY;
const rawModel = process.env.CLAUDE_CODE_MODEL;
const model = rawModel === undefined ? 'claude-opus-4-5-20251101' : rawModel;
const systemPrompt = process.env.CLAUDE_CODE_SYSTEM || 'You are a concise, helpful assistant.';
const maxTokens = Number.parseInt(process.env.CLAUDE_CODE_MAX_TOKENS || '512', 10);
const authHeader = process.env.CLAUDE_CODE_AUTH || 'x-api-key';
const anthropicVersion = process.env.CLAUDE_CODE_VERSION || '2023-06-01';
const prompt = process.argv.slice(2).join(' ') || 'Say hello in one short sentence.';

if (!apiKey) {
  console.error('Missing CLAUDE_CODE_API_KEY.');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
};

if (authHeader.toLowerCase() === 'bearer') {
  headers.Authorization = `Bearer ${apiKey}`;
} else if (authHeader.toLowerCase() === 'x-api-key') {
  headers['x-api-key'] = apiKey;
  headers['anthropic-version'] = anthropicVersion;
} else {
  headers[authHeader] = apiKey;
}

const body = {
  max_tokens: Number.isFinite(maxTokens) ? maxTokens : 512,
  system: systemPrompt,
  messages: [
    {
      role: 'user',
      content: [{ type: 'text', text: prompt }],
    },
  ],
  stream: true,
};

if (model && model.trim()) {
  body.model = model;
}

function extractStreamDelta(payload) {
  if (!payload || typeof payload !== 'object') return { text: '', done: false };

  if (payload.type === 'message_stop' || payload.type === 'content_block_stop') {
    return { text: '', done: true };
  }

  if (payload.type === 'content_block_delta' && typeof payload.delta?.text === 'string') {
    return { text: payload.delta.text, done: false };
  }

  if (typeof payload.delta?.text === 'string') {
    return { text: payload.delta.text, done: false };
  }

  if (typeof payload.completion === 'string') {
    return { text: payload.completion, done: false };
  }

  const openAiText = payload.choices?.[0]?.delta?.content;
  if (typeof openAiText === 'string') {
    return { text: openAiText, done: false };
  }

  if (Array.isArray(payload.content)) {
    const text = payload.content
      .map((block) => (typeof block?.text === 'string' ? block.text : ''))
      .join('');
    if (text) return { text, done: false };
  }

  return { text: '', done: false };
}

const url = baseUrl.includes(messagesPath)
  ? baseUrl
  : `${baseUrl.replace(/\/+$/, '')}${messagesPath}`;

const response = await fetch(url, {
  method: 'POST',
  headers,
  body: JSON.stringify(body),
});

if (!response.ok) {
  const errorText = await response.text().catch(() => '');
  console.error(`Request failed: ${response.status} ${errorText}`.trim());
  process.exit(1);
}

const contentType = response.headers.get('content-type') || '';

if (contentType.includes('application/json')) {
  const payload = await response.json();
  const contentBlocks = Array.isArray(payload?.content) ? payload.content : [];
  const text = contentBlocks
    .map((block) => (typeof block?.text === 'string' ? block.text : ''))
    .join('');
  if (text) {
    process.stdout.write(text);
    process.stdout.write('\n');
  } else {
    console.log('(no text received)');
  }
  process.exit(0);
}

const reader = response.body?.getReader();
if (!reader) {
  console.error('No response body.');
  process.exit(1);
}

const decoder = new TextDecoder();
let buffer = '';
let output = '';
let finished = false;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || !line.startsWith('data:')) continue;

    const data = line.slice(5).trim();
    if (!data) continue;

    if (data === '[DONE]') {
      finished = true;
      break;
    }

    try {
      const json = JSON.parse(data);
      const { text, done: isDone } = extractStreamDelta(json);
      if (text) {
        output += text;
        process.stdout.write(text);
      }
      if (isDone) {
        finished = true;
        break;
      }
    } catch {
      // ignore parse errors
    }
  }

  if (finished) break;
}

if (!output) {
  console.log('\n(no text received)');
} else {
  console.log('');
}
