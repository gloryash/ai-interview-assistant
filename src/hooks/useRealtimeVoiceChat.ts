import { useCallback, useRef, useState } from 'react';
import { useAudioPlayer } from './useAudioPlayer';
import { useTTS } from './useTTS';
import { useVoiceInteraction } from './useVoiceInteraction';
import { VoiceState } from '../services/voice/VoiceStateMachine';
import type { ChatProvider, ChatChunk } from '../services/chat/ChatProvider';
import type { MessageCallbacks } from '../types/message';
import type { UICallbacks } from '../types/ui';

export interface RealtimeVoiceChatConfig {
  apiKey: string;
  voiceId: string;
  voiceDisturbEnabled?: boolean;
  chatProvider?: ChatProvider;
  messageCallbacks?: MessageCallbacks;
  uiCallbacks?: UICallbacks;
  onTTSFinished?: () => void;
}

export function useRealtimeVoiceChat(config: RealtimeVoiceChatConfig) {
  const {
    apiKey,
    voiceId,
    voiceDisturbEnabled = true,
    chatProvider,
    messageCallbacks,
    uiCallbacks,
    onTTSFinished,
  } = config;

  const [sending, setSending] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const sseStartRef = useRef(true);

  const audioPlayer = useAudioPlayer(16000);
  const tts = useTTS();

  const alert = useCallback(
    (message: string) => {
      uiCallbacks?.onAlert?.(message);
    },
    [uiCallbacks],
  );

  const stopAll = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
    // 先立即停止音频播放，再关闭TTS连接
    await audioPlayer.stop();
    // 直接关闭TTS，不等待finish-task响应（可能会hang）
    await tts.close();
  }, [audioPlayer, tts]);

  const sendTextMessage = useCallback(
    async (text: string, skipAddMessage = false) => {
      if (!chatProvider) {
        alert('聊天服务未配置');
        return;
      }

      const stopAllPromise = stopAll();
      if (!skipAddMessage) {
        messageCallbacks?.onUserMessage?.(text);
      }
      await stopAllPromise;

      setSending(true);
      sseStartRef.current = true;

      try {
        await audioPlayer.connect(() => {
          setSending(false);
        });

        let ttsReady = false;
        try {
          await tts.connect(apiKey, voiceId, audioPlayer.pushPCM, () => {
            audioPlayer.sendTtsFinishedMsg();
            onTTSFinished?.();
          });
          ttsReady = true;
        } catch (error) {
          console.error('TTS connect failed', error);
          alert('语音服务连接失败');
        }

        abortRef.current?.abort();
        abortRef.current = new AbortController();

        await chatProvider.sendMessage(
          text,
          {},
          abortRef.current.signal,
          (chunk: ChatChunk) => {
            if (!chunk.text && sseStartRef.current && chunk.endpoint) {
              chunk.text = '嗯。';
              chunk.endpoint = false;
            }

            messageCallbacks?.onAssistantMessage?.(chunk.text, sseStartRef.current);

            if (ttsReady) {
              try {
                tts.sendText(chunk.text);
              } catch {
                ttsReady = false;
              }
            }
            sseStartRef.current = false;

            if (chunk.endpoint && ttsReady) {
              tts.stop().catch(console.warn);
            }
          },
        );
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Chat stream error', error);
        }
      } finally {
        setSending(false);
      }
    },
    [alert, audioPlayer, chatProvider, messageCallbacks, onTTSFinished, stopAll, tts, apiKey, voiceId],
  );

  const voiceInteraction = useVoiceInteraction({
    apiKey,
    voiceDisturbEnabled,
    onFinalText: (text) => {
      if (isRecognizing) {
        messageCallbacks?.onUpdateUserMessage?.(text);
        setIsRecognizing(false);
      }
      sendTextMessage(text, true);
      voiceInteraction.setState(VoiceState.IDLE);
    },
    onPartialText: (text) => {
      if (!isRecognizing) {
        setIsRecognizing(true);
        messageCallbacks?.onUserMessage?.(text);
      } else {
        messageCallbacks?.onUpdateUserMessage?.(text);
      }
    },
    onVoiceDetected: () => {
      audioPlayer.clear();
      abortRef.current?.abort();
      abortRef.current = null;
      tts.stop();
      tts.close();
    },
  });

  return {
    sending,
    voiceState: voiceInteraction.state,
    sendTextMessage,
    startListening: voiceInteraction.startListening,
    stopListening: voiceInteraction.stopListening,
    stopAll,
    notifySpeakingStart: voiceInteraction.notifySpeakingStart,
  };
}
