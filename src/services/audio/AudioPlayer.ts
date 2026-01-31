import type { AudioPlayerCallbacks } from '../../types/audio';

const DEFAULT_WORKLET_PATH = '/workers/pcmPlayerWorklet.js';

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private isConnected = false;
  private dataChunkIndex = 0;
  private callbacks: AudioPlayerCallbacks;
  private queuedChunks: Int16Array[] = [];
  private queuedOffset = 0;
  private taskFinished = false;
  private onPlaybackComplete?: () => void;

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

    let audioContext: AudioContext;
    try {
      audioContext = new AudioContextCtor({ sampleRate: this.sampleRate });
    } catch (error) {
      console.warn('[AudioPlayer] AudioContext init failed with sampleRate, retry default', error);
      audioContext = new AudioContextCtor();
    }

    this.audioContext = audioContext;
    this.onPlaybackComplete = onPlaybackComplete;
    this.taskFinished = false;

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    let useWorklet = Boolean(audioContext.audioWorklet);
    if (useWorklet) {
      try {
        await audioContext.audioWorklet.addModule(DEFAULT_WORKLET_PATH);
        this.workletNode = new AudioWorkletNode(audioContext, 'pcm-player-worklet');
        this.workletNode.connect(audioContext.destination);

        this.workletNode.port.onmessage = async (event) => {
          if (event.data?.type === 'playbackComplete') {
            await this.stop();
            this.onPlaybackComplete?.();
          }
        };

        this.workletNode.port.postMessage({
          type: 'init',
          sampleRate: this.sampleRate,
          bufferSize: Math.ceil(this.sampleRate * 2),
        });
      } catch (error) {
        console.warn('[AudioPlayer] AudioWorklet init failed, fallback to ScriptProcessor', error);
        useWorklet = false;
      }
    }

    if (!useWorklet) {
      if (!audioContext.createScriptProcessor) {
        throw new Error('Audio playback not supported in this browser');
      }

      this.scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
      this.scriptNode.onaudioprocess = (event) => {
        const output = event.outputBuffer.getChannelData(0);
        for (let i = 0; i < output.length; i += 1) {
          const chunk = this.queuedChunks[0];
          if (!chunk) {
            output[i] = 0;
            continue;
          }
          output[i] = chunk[this.queuedOffset] / 32768.0;
          this.queuedOffset += 1;
          if (this.queuedOffset >= chunk.length) {
            this.queuedChunks.shift();
            this.queuedOffset = 0;
          }
        }

        if (this.taskFinished && this.queuedChunks.length === 0) {
          void this.stop().then(() => this.onPlaybackComplete?.());
        }
      };
      this.scriptNode.connect(audioContext.destination);
    }

    this.isConnected = true;
  }

  pushPCM(arrayBuffer: ArrayBuffer) {
    if (!this.isConnected) {
      return;
    }

    this.callbacks.onAudioChunk?.(arrayBuffer, this.dataChunkIndex);
    this.dataChunkIndex += 1;

    const int16Data = new Int16Array(arrayBuffer);
    if (this.workletNode) {
      this.workletNode.port.postMessage(
        {
          type: 'audio',
          data: int16Data,
        },
        [int16Data.buffer],
      );
    } else {
      this.queuedChunks.push(new Int16Array(int16Data));
    }
  }

  sendTtsFinishedMsg() {
    this.taskFinished = true;
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'task-finished' });
      return;
    }
    if (this.queuedChunks.length === 0) {
      void this.stop().then(() => this.onPlaybackComplete?.());
    }
  }

  clear() {
    this.workletNode?.port.postMessage({ type: 'clear' });
    this.queuedChunks = [];
    this.queuedOffset = 0;
    this.callbacks.onClear?.();
  }

  async stop() {
    this.clear();

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode.onaudioprocess = null;
      this.scriptNode = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.isConnected = false;
    this.dataChunkIndex = 0;
    this.taskFinished = false;
    this.onPlaybackComplete = undefined;
  }
}
