import type { ITTSService } from './ITTSService';

export class CosyVoiceTTS implements ITTSService {
  private socket: WebSocket | null = null;
  private taskId: string | null = null;
  private isConnected = false;
  private isTaskStarted = false;
  private isTaskFinished = false;
  private resolveTaskFinished: (() => void) | null = null;
  private closePromise: Promise<void> | null = null;

  constructor(
    private apiKey: string,
    private voiceId: string,
    private modelName: string,
  ) {}

  private get wssUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/dashscope-ws/api-ws/v1/inference/?api_key=${this.apiKey}`;
  }

  connect(onAudioData: (pcmData: ArrayBuffer) => void, onTaskFinished: () => void) {
    return new Promise<void>(async (resolve, reject) => {
      if (this.closePromise) {
        await this.closePromise;
        this.closePromise = null;
      }

      this.socket = new WebSocket(this.wssUrl);
      this.socket.binaryType = 'arraybuffer';

      this.socket.onopen = () => {
        this.isConnected = true;
        this.taskId = this.generateUUID();

        const runTaskMessage = {
          header: {
            action: 'run-task',
            task_id: this.taskId,
            streaming: 'duplex',
          },
          payload: {
            task_group: 'audio',
            task: 'tts',
            function: 'SpeechSynthesizer',
            model: this.modelName,
            parameters: {
              text_type: 'PlainText',
              voice: this.voiceId,
              format: 'pcm',
              sample_rate: 16000,
              volume: 50,
              rate: 1,
              pitch: 1,
            },
            input: {},
          },
        };

        this.socket?.send(JSON.stringify(runTaskMessage));
      };

      this.socket.onmessage = (event) => {
        const data = event.data;
        if (typeof data === 'string') {
          const message = JSON.parse(data);
          if (message.header?.event === 'task-started') {
            this.isTaskStarted = true;
            this.isTaskFinished = false;
            resolve();
          } else if (message.header?.event === 'task-finished') {
            this.isTaskStarted = false;
            this.isTaskFinished = true;
            onTaskFinished?.();
            this.resolveTaskFinished?.();
          } else if (message.header?.event === 'task-failed') {
            this.isTaskStarted = false;
            this.isTaskFinished = true;
            console.error('[CosyVoiceTTS] task-failed', message);
            this.resolveTaskFinished?.();
          }
        } else if (data instanceof ArrayBuffer) {
          onAudioData(data);
        }
      };

      this.socket.onerror = (error) => reject(error);
      this.socket.onclose = () => {
        this.isConnected = false;
        this.isTaskStarted = false;
        if (!this.isTaskStarted && !this.isTaskFinished) {
          reject(new Error('WebSocket closed before task started'));
        }
      };
    });
  }

  sendText(text: string) {
    if (!this.isConnected || !this.isTaskStarted || !this.taskId || this.isTaskFinished) {
      throw new Error('WebSocket not ready');
    }
    const msg = {
      header: { action: 'continue-task', task_id: this.taskId, streaming: 'duplex' },
      payload: { input: { text } },
    };
    this.socket?.send(JSON.stringify(msg));
  }

  stop() {
    if (!this.isConnected || !this.isTaskStarted || !this.taskId || this.isTaskFinished) {
      return Promise.resolve();
    }
    const msg = {
      header: { action: 'finish-task', task_id: this.taskId, streaming: 'duplex' },
      payload: { input: {} },
    };
    this.socket?.send(JSON.stringify(msg));
    return new Promise<void>((resolve) => {
      this.resolveTaskFinished = resolve;
    });
  }

  close() {
    if (!this.socket) return Promise.resolve();
    const socket = this.socket;
    this.socket = null;
    this.isConnected = false;
    this.isTaskStarted = false;
    this.isTaskFinished = false;
    if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
      return Promise.resolve();
    }
    this.closePromise = new Promise<void>((resolve) => {
      socket.onclose = () => resolve();
      socket.onerror = () => resolve();
      socket.close();
    });
    return this.closePromise;
  }

  private generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
