import type { ITTSService } from './ITTSService';
import { CosyVoiceTTS } from './CosyVoiceTTS';

export function createTTSService(apiKey: string, voiceId: string): ITTSService {
  const modelName = voiceId.startsWith('long') || voiceId.startsWith('loon')
    ? 'cosyvoice-v1'
    : 'cosyvoice-v2';
  return new CosyVoiceTTS(apiKey, voiceId, modelName);
}
