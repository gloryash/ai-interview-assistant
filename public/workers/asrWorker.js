// ASR Worker - 直接使用 API Key
importScripts('../js/paraformerRealtimeApi.js');

let paraformer = null;
let isConnected = false;
let audioQueue = [];
let lastResultText = '';

let audioChunkCount = 0;

self.onmessage = async function(event) {
  const data = event.data;
  if (data.type === 'start') {
    console.log('[ASR Worker] 收到 start 指令, apiKey长度:', data.apiKey?.length || 0);
    audioChunkCount = 0;
    const protocol = self.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wssUrl = `${protocol}//${self.location.host}/dashscope-ws/api-ws/v1/inference/?api_key=${data.apiKey}`;
    startASR(wssUrl);
  } else if (data.type === 'audio') {
    audioChunkCount++;
    const audioData = data.data;
    const byteLen = audioData?.byteLength || 0;
    if (audioChunkCount <= 3 || audioChunkCount % 50 === 0) {
      console.log('[ASR Worker] 收到音频 #' + audioChunkCount + ', bytes:', byteLen, ', connected:', isConnected, ', queueLen:', audioQueue.length);
    }
    if (byteLen === 0) {
      console.warn('[ASR Worker] 收到空音频数据! 可能是 buffer 已被 transfer 导致 detached');
      return;
    }
    handleAudioData(audioData);
  } else if (data.type === 'stop') {
    console.log('[ASR Worker] 收到 stop 指令, 已发送音频块数:', audioChunkCount);
    stopASR();
  }
};

async function startASR(wssUrl) {
  lastResultText = '';
  paraformer = new ParaformerRealtime(wssUrl);
  try {
    postStatus('正在连接到ASR服务器...');
    await paraformer.connect(handleASRResult);
    isConnected = true;
    console.log('[ASR Worker] 连接成功, 队列中待发送音频:', audioQueue.length);
    postStatus('已连接到ASR服务器');
    while (audioQueue.length > 0 && isConnected) {
      const audioData = audioQueue.shift();
      paraformer.sendAudio(audioData);
    }
  } catch (error) {
    isConnected = false;
    console.error('[ASR Worker] 连接失败:', error.message);
    postError('连接ASR服务器失败: ' + error.message);
  }
}

function handleAudioData(audioData) {
  if (isConnected) {
    paraformer.sendAudio(audioData);
  } else {
    audioQueue.push(audioData);
  }
}

async function stopASR() {
  console.log('[ASR Worker] stopASR 开始, isConnected:', isConnected, ', paraformer:', !!paraformer);
  if (!isConnected || !paraformer) return;
  try {
    postStatus('正在结束识别任务...');
    await paraformer.stop();
    console.log('[ASR Worker] stop() 完成, lastResultText:', lastResultText);
    postStatus('识别任务已完成');
    isConnected = false;
  } catch (error) {
    console.error('[ASR Worker] stopASR 失败:', error.message);
    postError('停止识别任务失败: ' + error.message);
  } finally {
    paraformer.close();
    audioQueue = [];
  }
}

function handleASRResult(payload, isFinal) {
  console.log('[ASR Worker] handleASRResult, isFinal:', isFinal, ', hasPayload:', !!payload, ', hasSentence:', !!(payload?.output?.sentence));
  if (payload && payload.output && payload.output.sentence) {
    const resultText = payload.output.sentence.text || '';
    lastResultText = resultText;
    if (isFinal) {
      console.log('[ASR Worker] 发送 final_result:', resultText);
      self.postMessage({ type: 'final_result', text: resultText });
      lastResultText = '';
    } else {
      console.log('[ASR Worker] 发送 partial_result:', resultText);
      self.postMessage({ type: 'partial_result', text: resultText });
    }
  } else if (isFinal && lastResultText) {
    console.log('[ASR Worker] task-finished 无 sentence, 使用缓存结果:', lastResultText);
    self.postMessage({ type: 'final_result', text: lastResultText });
    lastResultText = '';
  } else {
    console.warn('[ASR Worker] handleASRResult 无有效数据, isFinal:', isFinal, ', lastResultText:', lastResultText);
  }
}

function postStatus(message) {
  self.postMessage({ type: 'status', message });
}

function postError(message) {
  self.postMessage({ type: 'error', message });
}
