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
      this.resolveTaskStarted = resolve;
      this.socket = new WebSocket(this.wssUrl);

      this.socket.onopen = () => {
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
        this.socket.send(JSON.stringify(runTaskMessage));
      };

      this.socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.header.event === "task-started") {
          this.isTaskStarted = true;
          if (this.resolveTaskStarted) this.resolveTaskStarted();
          resolve();
        } else if (message.header.event === "task-finished") {
          if (this.resolveTaskFinished) this.resolveTaskFinished();
          if (callback) callback(message.payload, true);
        } else if (message.header.event === "result-generated") {
          if (callback) callback(message.payload, false);
        }
      };

      this.socket.onerror = (error) => reject(error);
      this.socket.onclose = () => {
        this.isConnected = false;
        this.isTaskStarted = false;
        if (!this.isTaskStarted) reject(new Error("WebSocket closed"));
      };
    });
  }

  sendAudio(audioData) {
    if (!this.isConnected || !this.isTaskStarted) return;
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
