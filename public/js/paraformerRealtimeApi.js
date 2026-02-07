class ParaformerRealtime {
  constructor(wssUrl) {
    this.wssUrl = wssUrl;
    this.socket = null;
    this.taskId = null;
    this.isConnected = false;
    this.isTaskStarted = false;
    this.resolveTaskStarted = null;
    this.resolveTaskFinished = null;
  }

  connect(callback) {
    return new Promise((resolve, reject) => {
      let resolved = false;
      this.socket = new WebSocket(this.wssUrl);
      console.log('[Paraformer] 正在连接 WebSocket...');

      this.socket.onopen = () => {
        console.log('[Paraformer] WebSocket 已连接');
        this.isConnected = true;
        this.taskId = this.generateUUID();
        const runTaskMessage = {
          header: { action: "run-task", task_id: this.taskId, streaming: "duplex" },
          payload: {
            task_group: "audio",
            task: "asr",
            function: "recognition",
            model: "paraformer-realtime-v2",
            parameters: { format: "pcm", sample_rate: 16000, disfluency_removal_enabled: false, language_hints: ["zh"] },
            input: {}
          }
        };
        console.log('[Paraformer] 发送 run-task, task_id:', this.taskId);
        this.socket.send(JSON.stringify(runTaskMessage));
      };

      this.socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const eventName = message.header?.event;
        console.log('[Paraformer] 收到消息:', eventName, message.header?.code || '');

        if (eventName === "task-started") {
          this.isTaskStarted = true;
          if (!resolved) {
            resolved = true;
            resolve();
          }
        } else if (eventName === "task-finished") {
          console.log('[Paraformer] 任务完成, payload:', JSON.stringify(message.payload)?.slice(0, 200));
          if (this.resolveTaskFinished) this.resolveTaskFinished();
          if (callback) callback(message.payload, true);
        } else if (eventName === "result-generated") {
          const text = message.payload?.output?.sentence?.text || '';
          console.log('[Paraformer] 识别结果:', text);
          if (callback) callback(message.payload, false);
        } else if (eventName === "task-failed") {
          console.error('[Paraformer] 任务失败:', JSON.stringify(message));
          if (!resolved) {
            resolved = true;
            reject(new Error('ASR task failed: ' + (message.header?.message || 'unknown')));
          }
        }
      };

      this.socket.onerror = (error) => {
        console.error('[Paraformer] WebSocket 错误:', error);
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      };
      this.socket.onclose = (event) => {
        console.log('[Paraformer] WebSocket 关闭, code:', event.code, 'reason:', event.reason);
        const wasTaskStarted = this.isTaskStarted;
        this.isConnected = false;
        this.isTaskStarted = false;
        if (!resolved && !wasTaskStarted) {
          resolved = true;
          reject(new Error("WebSocket closed before task started, code: " + event.code));
        }
      };
    });
  }

  sendAudio(audioData) {
    if (!this.isConnected || !this.isTaskStarted) {
      console.warn('[Paraformer] sendAudio 跳过: connected=', this.isConnected, 'taskStarted=', this.isTaskStarted);
      return;
    }
    if (!this._audioCount) this._audioCount = 0;
    this._audioCount++;
    if (this._audioCount <= 3 || this._audioCount % 50 === 0) {
      const byteLen = audioData.byteLength || audioData.length || 0;
      console.log('[Paraformer] sendAudio #' + this._audioCount + ', bytes:', byteLen);
    }
    this.socket.send(audioData);
  }

  stop() {
    if (!this.isConnected || !this.isTaskStarted) return Promise.resolve();
    const msg = {
      header: { action: "finish-task", task_id: this.taskId, streaming: "duplex" },
      payload: { input: {} }
    };
    this.socket.send(JSON.stringify(msg));
    return new Promise((resolve) => { this.resolveTaskFinished = resolve; });
  }

  close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}
