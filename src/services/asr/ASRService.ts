export type ASRMessage =
  | { type: 'status'; message: string }
  | { type: 'partial_result'; text: string }
  | { type: 'final_result'; text: string }
  | { type: 'error'; message: string };

export class ASRService {
  private worker: Worker | null = null;

  constructor(private onMessage: (message: ASRMessage) => void) {}

  init(workerPath?: string) {
    if (this.worker) return;
    const origin = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost';
    const baseUrl = import.meta.env.BASE_URL || '/';
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const resolvedPath = workerPath
      || new URL(`${normalizedBase}workers/asrWorker.js`, origin).toString();
    this.worker = new Worker(resolvedPath);
    this.worker.onmessage = (event) => {
      this.onMessage(event.data as ASRMessage);
    };
  }

  start(apiKey: string) {
    if (!this.worker) throw new Error('ASR worker not initialized');
    this.worker.postMessage({ type: 'start', apiKey });
  }

  sendAudio(data: Int16Array) {
    if (!this.worker) return;
    this.worker.postMessage({ type: 'audio', data }, [data.buffer]);
  }

  stop() {
    if (!this.worker) return;
    this.worker.postMessage({ type: 'stop' });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
