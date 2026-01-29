import { aiInterviewScenario } from './ai-interview';
import type { ScenarioConfig } from '../../types/scenario';

/**
 * 所有可用场景
 */
export const scenarios: Record<string, ScenarioConfig> = {
  'ai-interview': aiInterviewScenario,
};

/**
 * 获取场景配置
 */
export function getScenario(id: string): ScenarioConfig | undefined {
  return scenarios[id];
}

/**
 * 获取所有场景列表
 */
export function getAllScenarios(): ScenarioConfig[] {
  return Object.values(scenarios);
}
