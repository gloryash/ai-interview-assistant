import { useCallback, useRef, useState } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { useASR } from './useASR';
import { VoiceState } from '../services/voice/VoiceStateMachine';
import type { VADProvider } from '../services/voice/VADProvider';
import { SimpleVADProvider } from '../services/voice/SimpleVADProvider';

const VAD_THRESHOLD = 0.5;
const VAD_THRESHOLD_COOLDOWN = 0.85;
const VAD_COOLDOWN_DURATION = 800;
const VAD_SILENCE_DURATION = 800;

interface UseVoiceInteractionOptions {
  apiKey: string;
  voiceDisturbEnabled?: boolean;
  vadProvider?: VADProvider;
  onFinalText?: (text: string) => void;
  onPartialText?: (text: string) => void;
  onVoiceDetected?: () => void;
}

export function useVoiceInteraction(options: UseVoiceInteractionOptions) {
  const {
    apiKey,
    voiceDisturbEnabled = true,
    vadProvider,
    onFinalText,
    onPartialText,
    onVoiceDetected,
  } = options;

  const [state, setState] = useState<VoiceState>(VoiceState.IDLE);
  const { startRecorder, stopRecorder } = useAudioRecorder();
  const { initASR, startASR, sendAudio, stopASR, terminateASR } = useASR();

  const isRecordingRef = useRef(false);
  const lastVoiceTimeRef = useRef(0);
  const speakingStartTimeRef = useRef<number | null>(null);
  const lastSamplesRef = useRef<Int16Array[]>([]);
  const vadRef = useRef<VADProvider>(vadProvider || new SimpleVADProvider());

  const voiceDisturbEnabledRef = useRef(voiceDisturbEnabled);
  const onVoiceDetectedRef = useRef(onVoiceDetected);
  const onFinalTextRef = useRef(onFinalText);
  const onPartialTextRef = useRef(onPartialText);
  const pauseNewRecordingRef = useRef(false);

  voiceDisturbEnabledRef.current = voiceDisturbEnabled;
  onVoiceDetectedRef.current = onVoiceDetected;
  onFinalTextRef.current = onFinalText;
  onPartialTextRef.current = onPartialText;

  const startAsrRecording = useCallback(() => {
    if (isRecordingRef.current) return;
    console.log('[startAsrRecording] 开始ASR录音');
    isRecordingRef.current = true;
    setState(VoiceState.RECORDING);
    startASR(apiKey);
    const samples = lastSamplesRef.current.slice(-8);
    console.log('[startAsrRecording] 发送历史样本数:', samples.length);
    samples.forEach((sample) => sendAudio(sample));
  }, [apiKey, startASR, sendAudio]);

  const stopAsrRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    console.log('[stopAsrRecording] 停止ASR录音');
    isRecordingRef.current = false;
    setState(VoiceState.PROCESSING);
    stopASR();
  }, [stopASR]);

  const handleAudioData = useCallback(
    (pcmData: Int16Array) => {
      lastSamplesRef.current.push(new Int16Array(pcmData));
      if (lastSamplesRef.current.length > 11) {
        lastSamplesRef.current = lastSamplesRef.current.slice(-11);
      }

      const speechScore = vadRef.current.computeScore(pcmData);
      const currentTime = Date.now();

      const inCooldown =
        speakingStartTimeRef.current !== null &&
        currentTime - speakingStartTimeRef.current < VAD_COOLDOWN_DURATION;
      const threshold = inCooldown ? VAD_THRESHOLD_COOLDOWN : VAD_THRESHOLD;

      // 调试：每隔一段时间打印VAD分数
      if (Math.random() < 0.1) {
        const isVoice = speechScore > threshold;
        const color = isVoice ? 'color: red; font-weight: bold' : 'color: blue';
        console.log(
          `%c[VAD] 分数: ${speechScore.toFixed(2)} | 阈值: ${threshold}${inCooldown ? '(冷却中)' : ''} | ${isVoice ? '语音' : '静音'} | 录音中: ${isRecordingRef.current}`,
          color
        );
      }

      if (speechScore > threshold && lastSamplesRef.current.length > 1) {
        if (!isRecordingRef.current) {
          // 如果暂停了新录音，不开始新的 ASR 会话
          if (pauseNewRecordingRef.current) {
            return;
          }
          if (voiceDisturbEnabledRef.current) {
            onVoiceDetectedRef.current?.();
          }
          startAsrRecording();
        }
        sendAudio(new Int16Array(pcmData));
        lastVoiceTimeRef.current = currentTime;
      } else if (isRecordingRef.current) {
        if (lastVoiceTimeRef.current && currentTime - lastVoiceTimeRef.current > VAD_SILENCE_DURATION) {
          stopAsrRecording();
        } else {
          sendAudio(new Int16Array(pcmData));
        }
      }
    },
    [sendAudio, startAsrRecording, stopAsrRecording],
  );

  const lastTextRef = useRef('');

  const startListening = useCallback(async () => {
    console.log('[startListening] 开始监听');
    lastTextRef.current = '';
    initASR((msg) => {
      if (msg.type === 'partial_result') {
        console.log('[ASR] 部分结果:', msg.text);
        lastTextRef.current = msg.text;
        onPartialTextRef.current?.(msg.text);
      } else if (msg.type === 'final_result') {
        console.log('[ASR] 最终结果(保存):', msg.text);
        lastTextRef.current = msg.text;
        // 不在这里调用 onFinalText，等待 status: '识别任务已完成'
      } else if (msg.type === 'status' && msg.message === '识别任务已完成') {
        console.log('[ASR] 识别任务已完成，发送最终文本:', lastTextRef.current);
        if (lastTextRef.current) {
          onFinalTextRef.current?.(lastTextRef.current);
          lastTextRef.current = '';
        }
      }
    });
    setState(VoiceState.LISTENING);
    await startRecorder(handleAudioData);
    speakingStartTimeRef.current = Date.now();
    console.log('[startListening] 麦克风就绪，进入冷却期');
  }, [initASR, startRecorder, handleAudioData]);

  const stopListening = useCallback(async () => {
    await stopRecorder();
    terminateASR();
    setState(VoiceState.IDLE);
    isRecordingRef.current = false;
    lastSamplesRef.current = [];
  }, [stopRecorder, terminateASR]);

  const notifySpeakingStart = useCallback(() => {
    speakingStartTimeRef.current = Date.now();
  }, []);

  const setPauseNewRecording = useCallback((pause: boolean) => {
    pauseNewRecordingRef.current = pause;
  }, []);

  return {
    state,
    setState,
    startListening,
    stopListening,
    notifySpeakingStart,
    setPauseNewRecording,
  };
}
