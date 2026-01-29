/**
 * UI 回调接口
 */
export interface UICallbacks {
  onAlert?: (message: string) => void;
  onError?: (error: Error) => void;
}
