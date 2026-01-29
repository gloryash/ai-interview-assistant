export interface ITTSService {
  connect(
    onAudioData: (pcmData: ArrayBuffer) => void,
    onTaskFinished: () => void,
  ): Promise<void>;
  sendText(text: string): void;
  stop(): Promise<void>;
  close(): Promise<void>;
}
