import type { AudioPlayerCallbacks } from '../../types/audio';

const DEFAULT_WORKLET_PATH = '/workers/pcmPlayerWorklet.js';

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private isConnected = false;
  private dataChunkIndex = 0;
  private callbacks: AudioPlayerCallbacks;

  constructor(private sampleRate: number, callbacks?: AudioPlayerCallbacks) {
    this.callbacks = callbacks || {};
  }

  setCallbacks(callbacks: AudioPlayerCallbacks) {
    this.callbacks = callbacks;
  }

  async connect(onPlaybackComplete?: () => void) {
    if (this.isConnected) {
      return;
    }

    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error('Web Audio API not supported');
    }

    this.audioContext = new AudioContextCtor({ sampleRate: this.sampleRate });

    if (!this.audioContext.audioWorklet) {
      throw new Error('AudioWorklet not supported in this browser');
    }

    await this.audioContext.audioWorklet.addModule(DEFAULT_WORKLET_PATH);

    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-player-worklet');
    this.workletNode.connect(this.audioContext.destination);

    this.workletNode.port.onmessage = async (event) => {
      if (event.data?.type === 'playbackComplete') {
        await this.stop();
        onPlaybackComplete?.();
      }
    };

    this.workletNode.port.postMessage({
      type: 'init',
      sampleRate: this.sampleRate,
      bufferSize: Math.ceil(this.sampleRate * 2),
    });

    this.isConnected = true;
  }

  pushPCM(arrayBuffer: ArrayBuffer) {
    if (!this.isConnected || !this.workletNode) {
      return;
    }

    this.callbacks.onAudioChunk?.(arrayBuffer, this.dataChunkIndex);
    this.dataChunkIndex += 1;

    const int16Data = new Int16Array(arrayBuffer);
    this.workletNode.port.postMessage(
      {
        type: 'audio',
        data: int16Data,
      },
      [int16Data.buffer],
    );
  }

  sendTtsFinishedMsg() {
    this.workletNode?.port.postMessage({ type: 'task-finished' });
  }

  clear() {
    this.workletNode?.port.postMessage({ type: 'clear' });
    this.callbacks.onClear?.();
  }

  async stop() {
    this.clear();

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.isConnected = false;
    this.dataChunkIndex = 0;
  }
}
