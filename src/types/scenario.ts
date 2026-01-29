/**
 * 阶段配置
 */
export interface StageConfig {
  id: string;
  name: string;
  prompt: string;
  requiredFields: string[];
}

/**
 * 产物配置
 */
export interface OutputConfig {
  id: string;
  name: string;
  generatorPrompt: string;
  template?: string;
}

/**
 * 场景配置
 */
export interface ScenarioConfig {
  id: string;
  name: string;
  interviewPrompt: string;
  stages: StageConfig[];
  outputs: OutputConfig[];
}
