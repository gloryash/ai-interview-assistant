#!/usr/bin/env node
/* eslint-disable no-console */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const apiKey = process.env.DASHSCOPE_API_KEY || process.env.VITE_DASHSCOPE_API_KEY;
if (!apiKey) {
  console.error('Missing DASHSCOPE_API_KEY or VITE_DASHSCOPE_API_KEY.');
  process.exit(1);
}

const outputDir = path.join(projectRoot, 'public', 'tts-samples');
const sampleRate = 16000;

const voices = [
  { id: 'longxiaochun', text: '你好，我是龙小淳。' },
  { id: 'longwan', text: '你好，我是龙婉。' },
  { id: 'longxiaoxia', text: '你好，我是龙小夏。' },
  { id: 'longanhuan', text: '你好，我是龙安欢。' },
  { id: 'longyingxiao', text: '你好，我是龙莹笑。' },
  { id: 'longmiao', text: '你好，我是龙妙。' },
  { id: 'longyue', text: '你好，我是龙悦。' },
  { id: 'longanyang', text: '你好，我是龙安洋。' },
  { id: 'longfei', text: '你好，我是龙飞。' },
  { id: 'longyingxun', text: '你好，我是龙英勋。' },
  { id: 'longshuo', text: '你好，我是龙硕。' },
  { id: 'longhua', text: '你好，我是龙华。' },
  { id: 'longcheng', text: '你好，我是龙橙。' },
  { id: 'longxiang', text: '你好，我是龙祥。' },
  { id: 'longjielidou', text: '你好，我是龙杰力豆。' },
  { id: 'longlaotie', text: '你好，我是龙老铁。' },
  { id: 'longanyue', text: '你好，我是龙安粤。' },
  { id: 'loongstella', text: 'Hello, I am Stella.' },
];

const wssUrl = `wss://dashscope.aliyuncs.com/api-ws/v1/inference/?api_key=${apiKey}`;

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getModelName(voiceId) {
  return voiceId.startsWith('long') || voiceId.startsWith('loon') ? 'cosyvoice-v1' : 'cosyvoice-v2';
}

function buildWav(chunks, totalSamples, sampleRateHz) {
  const dataLength = totalSamples * 2;
  const buffer = Buffer.alloc(44 + dataLength);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRateHz, 24);
  buffer.writeUInt32LE(sampleRateHz * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  let offset = 44;
  for (const chunk of chunks) {
    const src = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    src.copy(buffer, offset);
    offset += src.byteLength;
  }

  return buffer;
}

async function synthesizeVoice(voiceId, text, modelName) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wssUrl);
    const chunks = [];
    let totalSamples = 0;
    let taskStarted = false;
    let finished = false;
    const taskId = generateUUID();

    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      const runTaskMessage = {
        header: {
          action: 'run-task',
          task_id: taskId,
          streaming: 'duplex',
        },
        payload: {
          task_group: 'audio',
          task: 'tts',
          function: 'SpeechSynthesizer',
          model: modelName,
          parameters: {
            text_type: 'PlainText',
            voice: voiceId,
            format: 'pcm',
            sample_rate: sampleRate,
            volume: 50,
            rate: 1,
            pitch: 1,
          },
          input: {},
        },
      };
      ws.send(JSON.stringify(runTaskMessage));
    };

    ws.onerror = (error) => {
      if (!finished) {
        finished = true;
        reject(error);
      }
    };

    ws.onmessage = (event) => {
      const data = event.data;
      if (typeof data === 'string') {
        let message;
        try {
          message = JSON.parse(data);
        } catch {
          return;
        }
        const eventType = message?.header?.event;
        if (eventType === 'task-started') {
          taskStarted = true;
          const msg = {
            header: { action: 'continue-task', task_id: taskId, streaming: 'duplex' },
            payload: { input: { text } },
          };
          ws.send(JSON.stringify(msg));
          setTimeout(() => {
            const finishMsg = {
              header: { action: 'finish-task', task_id: taskId, streaming: 'duplex' },
              payload: { input: {} },
            };
            ws.send(JSON.stringify(finishMsg));
          }, 300);
        } else if (eventType === 'task-finished') {
          if (!finished) {
            finished = true;
            ws.close();
            resolve({ chunks, totalSamples });
          }
        } else if (eventType === 'task-failed') {
          if (!finished) {
            finished = true;
            ws.close();
            const detail = message?.payload?.message || message?.payload?.error || '';
            reject(new Error(`TTS task failed for ${voiceId} (${modelName})${detail ? `: ${detail}` : ''}`));
          }
        }
      } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(data.buffer);
        if (buffer.byteLength > 0) {
          const int16 = new Int16Array(buffer.buffer, buffer.byteOffset, Math.floor(buffer.byteLength / 2));
          const copy = new Int16Array(int16);
          chunks.push(copy);
          totalSamples += copy.length;
        }
      }
    };

    ws.onclose = () => {
      if (!finished && taskStarted) {
        finished = true;
        resolve({ chunks, totalSamples });
      }
    };
  });
}

await fs.mkdir(outputDir, { recursive: true });

const failures = [];

for (const voice of voices) {
  console.log(`Generating sample for ${voice.id}...`);
  try {
    const modelCandidates = [getModelName(voice.id)];
    if (!modelCandidates.includes('cosyvoice-v2')) {
      modelCandidates.push('cosyvoice-v2');
    }

    let success = false;
    for (const modelName of modelCandidates) {
      try {
        const { chunks, totalSamples } = await synthesizeVoice(voice.id, voice.text, modelName);
        const wav = buildWav(chunks, totalSamples, sampleRate);
        const outPath = path.join(outputDir, `${voice.id}.wav`);
        await fs.writeFile(outPath, wav);
        console.log(`Saved ${outPath} (${modelName})`);
        success = true;
        break;
      } catch (error) {
        console.warn(`Failed with ${modelName}:`, error?.message || error);
      }
    }

    if (!success) {
      failures.push(voice.id);
    }
  } catch (error) {
    console.warn(`Failed to generate ${voice.id}:`, error?.message || error);
    failures.push(voice.id);
  }
}

if (failures.length) {
  console.log(`Done with failures: ${failures.join(', ')}`);
} else {
  console.log('Done.');
}
