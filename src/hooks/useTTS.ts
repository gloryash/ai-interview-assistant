import { useCallback, useRef } from 'react';
import type { ITTSService } from '../services/tts/ITTSService';
import { createTTSService } from '../services/tts/TTSFactory';

export function useTTS() {
  const ttsRef = useRef<ITTSService | null>(null);

  const connect = useCallback(
    async (
      apiKey: string,
      voiceId: string,
      onAudioData: (data: ArrayBuffer) => void,
      onFinished: () => void,
    ) => {
      ttsRef.current = createTTSService(apiKey, voiceId);
      await ttsRef.current.connect(onAudioData, onFinished);
    },
    [],
  );

  const sendText = useCallback((text: string) => {
    ttsRef.current?.sendText(text);
  }, []);

  const stop = useCallback(async () => {
    await ttsRef.current?.stop();
  }, []);

  const close = useCallback(async () => {
    await ttsRef.current?.close();
    ttsRef.current = null;
  }, []);

  return { connect, sendText, stop, close };
}
