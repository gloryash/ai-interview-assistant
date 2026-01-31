class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.bufferSize = 1024;
  }

  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0];
      for (let i = 0; i < channelData.length; i++) {
        this.buffer.push(channelData[i]);
        if (this.buffer.length >= this.bufferSize) {
          const int16Array = new Int16Array(this.bufferSize);
          for (let j = 0; j < this.bufferSize; j++) {
            int16Array[j] = Math.max(-32768, Math.min(32767, Math.round(this.buffer[j] * 32767)));
          }
          this.port.postMessage(int16Array);
          this.buffer = [];
        }
      }
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
