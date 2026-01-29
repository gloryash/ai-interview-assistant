import { useCallback, useRef } from 'react';
import { AudioPlayer } from '../services/audio/AudioPlayer';
import type { AudioPlayerCallbacks } from '../types/audio';

export function useAudioPlayer(sampleRate = 16000, callbacks?: AudioPlayerCallbacks) {
  const playerRef = useRef<AudioPlayer | null>(null);

  const connect = useCallback(
    async (onFinished?: () => void) => {
      if (!playerRef.current) {
        playerRef.current = new AudioPlayer(sampleRate, callbacks);
      }
      await playerRef.current.connect(onFinished);
    },
    [sampleRate, callbacks],
  );

  const pushPCM = useCallback((data: ArrayBuffer) => {
    playerRef.current?.pushPCM(data);
  }, []);

  const sendTtsFinishedMsg = useCallback(() => {
    playerRef.current?.sendTtsFinishedMsg();
  }, []);

  const clear = useCallback(() => {
    playerRef.current?.clear();
  }, []);

  const stop = useCallback(async () => {
    await playerRef.current?.stop();
  }, []);

  return { connect, pushPCM, sendTtsFinishedMsg, clear, stop };
}
