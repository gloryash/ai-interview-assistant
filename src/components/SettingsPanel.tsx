import { useState } from 'react';
import type { AppConfig } from '../stores/config';
import { aiInterviewScenario } from '../config/scenarios/ai-interview';
import './SettingsPanel.css';

interface SettingsPanelProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
}

export function SettingsPanel({ config, onSave, onClose }: SettingsPanelProps) {
  const [form, setForm] = useState<AppConfig>({ ...config });
  const [showScenarioSettings, setShowScenarioSettings] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <h2>设置</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>阿里百炼 API Key</label>
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>

          <div className="form-group">
            <label>LLM 模型</label>
            <select
              value={form.llmModel}
              onChange={(e) => setForm({ ...form, llmModel: e.target.value })}
            >
              <option value="qwen-plus">qwen-plus</option>
              <option value="qwen-turbo">qwen-turbo</option>
              <option value="qwen-max">qwen-max</option>
            </select>
          </div>

          <div className="form-group">
            <label>TTS 语音</label>
            <select
              value={form.voiceId}
              onChange={(e) => setForm({ ...form, voiceId: e.target.value })}
            >
              <option value="longxiaochun">龙小淳</option>
              <option value="longwan">龙婉</option>
              <option value="longyue">龙悦</option>
              <option value="loongstella">Stella</option>
            </select>
          </div>

          <div className="form-group">
            <label>系统人设</label>
            <textarea
              value={form.systemPrompt}
              onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
              rows={4}
            />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={form.voiceDisturbEnabled}
                onChange={(e) => setForm({ ...form, voiceDisturbEnabled: e.target.checked })}
              />
              启用语音打断
            </label>
          </div>

          <div className="scenario-section">
            <button
              type="button"
              className="section-toggle"
              onClick={() => setShowScenarioSettings(!showScenarioSettings)}
            >
              {showScenarioSettings ? '▼' : '▶'} AI 访谈场景配置
            </button>

            {showScenarioSettings && (
              <div className="scenario-prompts">
                <div className="form-group">
                  <label>采访 Agent 提示词</label>
                  <textarea
                    value={form.scenarioPrompts?.interviewPrompt || aiInterviewScenario.interviewPrompt}
                    onChange={(e) => setForm({
                      ...form,
                      scenarioPrompts: { ...form.scenarioPrompts, interviewPrompt: e.target.value }
                    })}
                    rows={6}
                  />
                </div>
                <div className="form-group">
                  <label>PRD 生成 Agent 提示词</label>
                  <textarea
                    value={form.scenarioPrompts?.prdPrompt || aiInterviewScenario.outputs[0]?.generatorPrompt}
                    onChange={(e) => setForm({
                      ...form,
                      scenarioPrompts: { ...form.scenarioPrompts, prdPrompt: e.target.value }
                    })}
                    rows={4}
                  />
                </div>
                <div className="form-group">
                  <label>用户画像 Agent 提示词</label>
                  <textarea
                    value={form.scenarioPrompts?.personaPrompt || aiInterviewScenario.outputs[1]?.generatorPrompt}
                    onChange={(e) => setForm({
                      ...form,
                      scenarioPrompts: { ...form.scenarioPrompts, personaPrompt: e.target.value }
                    })}
                    rows={4}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose}>取消</button>
            <button type="submit">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
}
