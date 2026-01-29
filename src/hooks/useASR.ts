import { useCallback, useRef } from 'react';
import { ASRService, type ASRMessage } from '../services/asr/ASRService';

export function useASR() {
  const asrRef = useRef<ASRService | null>(null);

  const initASR = useCallback((onMessage: (msg: ASRMessage) => void) => {
    if (!asrRef.current) {
      asrRef.current = new ASRService(onMessage);
      asrRef.current.init();
    }
  }, []);

  const startASR = useCallback((apiKey: string) => {
    asrRef.current?.start(apiKey);
  }, []);

  const sendAudio = useCallback((data: Int16Array) => {
    asrRef.current?.sendAudio(data);
  }, []);

  const stopASR = useCallback(() => {
    asrRef.current?.stop();
  }, []);

  const terminateASR = useCallback(() => {
    asrRef.current?.terminate();
    asrRef.current = null;
  }, []);

  return { initASR, startASR, sendAudio, stopASR, terminateASR };
}
