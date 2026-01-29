/**
 * 音频播放回调接口
 */
export interface AudioPlayerCallbacks {
  onAudioChunk?: (buffer: ArrayBuffer, chunkIndex: number) => void;
  onClear?: () => void;
  onStop?: () => void;
}
