import type { VADProvider } from './VADProvider';

/**
 * 简单的基于能量的 VAD 实现
 */
export class SimpleVADProvider implements VADProvider {
  computeScore(pcmData: Int16Array): number {
    let sum = 0;
    for (let i = 0; i < pcmData.length; i++) {
      sum += Math.abs(pcmData[i]);
    }
    const avgEnergy = sum / pcmData.length / 32768;
    return Math.min(avgEnergy * 10, 1);
  }
}
