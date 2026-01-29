import { useCallback, useRef } from 'react';
import { AudioRecorder } from '../services/audio/AudioRecorder';

export function useAudioRecorder() {
  const recorderRef = useRef<AudioRecorder | null>(null);

  const startRecorder = useCallback(async (onAudioData: (data: Int16Array) => void) => {
    if (!recorderRef.current) {
      recorderRef.current = new AudioRecorder();
    }
    await recorderRef.current.start(onAudioData);
  }, []);

  const stopRecorder = useCallback(async () => {
    await recorderRef.current?.stop();
  }, []);

  return { startRecorder, stopRecorder };
}
