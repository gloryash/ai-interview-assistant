import type { ITTSService } from './ITTSService';
import { CosyVoiceTTS } from './CosyVoiceTTS';

const COSYVOICE_V2_VOICES = new Set([
  'longyingxiao',
  'longyingxun',
  'longanyue',
]);

export function createTTSService(apiKey: string, voiceId: string): ITTSService {
  const modelName = COSYVOICE_V2_VOICES.has(voiceId)
    ? 'cosyvoice-v2'
    : voiceId.startsWith('long') || voiceId.startsWith('loon')
      ? 'cosyvoice-v1'
      : 'cosyvoice-v2';
  return new CosyVoiceTTS(apiKey, voiceId, modelName);
}
