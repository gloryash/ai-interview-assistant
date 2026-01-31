// ASR Worker - 直接使用 API Key
importScripts('../js/paraformerRealtimeApi.js');

let paraformer = null;
let isConnected = false;
let audioQueue = [];
let lastResultText = '';

self.onmessage = async function(event) {
  const data = event.data;
  if (data.type === 'start') {
    const wssUrl = `wss://dashscope.aliyuncs.com/api-ws/v1/inference/?api_key=${data.apiKey}`;
    startASR(wssUrl);
  } else if (data.type === 'audio') {
    handleAudioData(data.data);
  } else if (data.type === 'stop') {
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
    postStatus('已连接到ASR服务器');
    while (audioQueue.length > 0 && isConnected) {
      const audioData = audioQueue.shift();
      paraformer.sendAudio(audioData);
    }
  } catch (error) {
    isConnected = false;
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
  if (!isConnected || !paraformer) return;
  try {
    postStatus('正在结束识别任务...');
    await paraformer.stop();
    postStatus('识别任务已完成');
    isConnected = false;
  } catch (error) {
    postError('停止识别任务失败: ' + error.message);
  } finally {
    paraformer.close();
    audioQueue = [];
  }
}

function handleASRResult(payload, isFinal) {
  if (payload && payload.output && payload.output.sentence) {
    const resultText = payload.output.sentence.text || '';
    lastResultText = resultText;
    if (isFinal) {
      self.postMessage({ type: 'final_result', text: resultText });
      lastResultText = '';
    } else {
      self.postMessage({ type: 'partial_result', text: resultText });
    }
  } else if (isFinal && lastResultText) {
    // task-finished 时 payload 可能为空，使用保存的结果
    self.postMessage({ type: 'final_result', text: lastResultText });
    lastResultText = '';
  }
}

function postStatus(message) {
  self.postMessage({ type: 'status', message });
}

function postError(message) {
  self.postMessage({ type: 'error', message });
}
