/**
 * 消息回调接口
 */
export interface MessageCallbacks {
  onUserMessage?: (text: string) => void;
  onAssistantMessage?: (text: string, isFirst: boolean) => void;
  onUpdateUserMessage?: (text: string) => void;
}
