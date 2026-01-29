export interface VADProvider {
  computeScore(pcmData: Int16Array): number;
}
