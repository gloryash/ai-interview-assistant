export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;

  async start(onAudioData: (data: Int16Array) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.audioContext = new AudioContext({ sampleRate: 16000 });

    await this.audioContext.audioWorklet.addModule('/workers/audioProcessor.js');

    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

    this.workletNode.port.onmessage = (event) => {
      onAudioData(event.data as Int16Array);
    };

    source.connect(this.workletNode);
    this.workletNode.connect(this.audioContext.destination);
  }

  async stop(): Promise<void> {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}
