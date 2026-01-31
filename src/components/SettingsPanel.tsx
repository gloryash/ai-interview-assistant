import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppConfig } from '../stores/config';
import type { LLMProvider } from '../types/llm';
import { aiInterviewScenario } from '../config/scenarios/ai-interview';
import { aiDailyReflectionScenario } from '../config/scenarios/ai-daily-reflection';
import './SettingsPanel.css';

const PROVIDER_OPTIONS: Array<{ value: LLMProvider; label: string }> = [
  { value: 'claude', label: 'Claude' },
  { value: 'dashscope', label: '阿里云' },
];

const MODEL_OPTIONS: Record<LLMProvider, string[]> = {
  claude: [
    'claude-opus-4-5-20251101',
    'claude-sonnet-4-5-20250929',
    'claude-haiku-4-5-20251001',
  ],
  dashscope: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
};

const VOICE_SAMPLES: Record<string, string> = {
  longxiaochun: '/tts-samples/longxiaochun.wav',
  longwan: '/tts-samples/longwan.wav',
  longxiaoxia: '/tts-samples/longxiaoxia.wav',
  longyingxiao: '/tts-samples/longyingxiao.wav',
  longmiao: '/tts-samples/longmiao.wav',
  longyue: '/tts-samples/longyue.wav',
  longfei: '/tts-samples/longfei.wav',
  longyingxun: '/tts-samples/longyingxun.wav',
  longshuo: '/tts-samples/longshuo.wav',
  longhua: '/tts-samples/longhua.wav',
  longcheng: '/tts-samples/longcheng.wav',
  longxiang: '/tts-samples/longxiang.wav',
  longjielidou: '/tts-samples/longjielidou.wav',
  longlaotie: '/tts-samples/longlaotie.wav',
  longanyue: '/tts-samples/longanyue.wav',
  loongstella: '/tts-samples/loongstella.wav',
};

const UNAVAILABLE_VOICES = new Set(['longanhuan', 'longanyang']);

/**
 * CosyVoice 语音选项列表
 * 来源: 阿里云 DashScope CosyVoice 官方文档
 */
const VOICE_OPTIONS: Array<{ value: string; label: string; desc: string }> = [
  // 女声
  { value: 'longxiaochun', label: '龙小淳', desc: '温柔女声' },
  { value: 'longwan', label: '龙婉', desc: '标准女声' },
  { value: 'longxiaoxia', label: '龙小夏', desc: '温柔女声' },
  { value: 'longanhuan', label: '龙安欢', desc: '欢脱元气女' },
  { value: 'longyingxiao', label: '龙莹笑', desc: '清甜推销女' },
  { value: 'longmiao', label: '龙妙', desc: '甜美女声' },
  { value: 'loongstella', label: 'Stella', desc: '英文女声' },
  // 男声
  { value: 'longyue', label: '龙悦', desc: '标准男声' },
  { value: 'longanyang', label: '龙安洋', desc: '阳光大男孩' },
  { value: 'longfei', label: '龙飞', desc: '热血磁性男' },
  { value: 'longyingxun', label: '龙英勋', desc: '年轻青涩男' },
  { value: 'longshuo', label: '龙硕', desc: '成熟男声' },
  { value: 'longhua', label: '龙华', desc: '稳重男声' },
  { value: 'longcheng', label: '龙橙', desc: '活力男声' },
  { value: 'longxiang', label: '龙祥', desc: '新闻播报男' },
  { value: 'longjielidou', label: '龙杰力豆', desc: '中英双语男' },
  // 特色音色
  { value: 'longlaotie', label: '龙老铁', desc: '东北口音' },
  { value: 'longanyue', label: '龙安粤', desc: '粤语男声' },
];

function getModelOptions(provider: LLMProvider, currentModel: string): string[] {
  const options = MODEL_OPTIONS[provider] || [];
  if (currentModel && !options.includes(currentModel)) {
    return [currentModel, ...options];
  }
  return options;
}

function normalizeModel(provider: LLMProvider, currentModel: string): string {
  const options = MODEL_OPTIONS[provider] || [];
  if (options.includes(currentModel)) return currentModel;
  return options[0] || '';
}

interface SettingsPanelProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
}

export function SettingsPanel({ config, onSave, onClose }: SettingsPanelProps) {
  const [form, setForm] = useState<AppConfig>({ ...config });
  const [showScenarioSettings, setShowScenarioSettings] = useState(false);
  const [showReflectionSettings, setShowReflectionSettings] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    void stopPreview();
  }, [stopPreview]);

  const handlePreviewVoice = useCallback(async () => {
    if (isPreviewing) return;

    const sampleSrc = VOICE_SAMPLES[form.voiceId];
    if (!sampleSrc) {
      alert('当前语音暂无预览音频');
      return;
    }

    stopPreview();
    const audio = new Audio(sampleSrc);
    audioRef.current = audio;
    setIsPreviewing(true);

    const reset = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
      setIsPreviewing(false);
    };

    audio.onended = reset;
    audio.onerror = () => {
      console.error('TTS preview failed: audio error');
      alert('语音预览失败');
      reset();
    };

    try {
      await audio.play();
    } catch (error) {
      console.error('TTS preview failed', error);
      alert('语音预览失败');
      reset();
    }
  }, [form.voiceId, isPreviewing, stopPreview]);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <h2>设置</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Claude API Key</label>
            <input
              type="password"
              value={form.claudeApiKey}
              onChange={(e) => setForm({ ...form, claudeApiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>

          <div className="form-group">
            <label>阿里云 DashScope API Key（语音/阿里云模型）</label>
            <input
              type="password"
              value={form.dashscopeApiKey}
              onChange={(e) => setForm({ ...form, dashscopeApiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>

          <div className="agent-section">
            <div className="agent-title">采访 Agent</div>
            <div className="agent-row">
              <div className="form-group">
                <label>提供商</label>
                <select
                  value={form.interviewProvider}
                  onChange={(e) => {
                    const provider = e.target.value as LLMProvider;
                    setForm({
                      ...form,
                      interviewProvider: provider,
                      interviewModel: normalizeModel(provider, form.interviewModel),
                    });
                  }}
                >
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>模型</label>
                <select
                  value={form.interviewModel}
                  onChange={(e) => setForm({ ...form, interviewModel: e.target.value })}
                >
                  {getModelOptions(form.interviewProvider, form.interviewModel).map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="agent-section">
            <div className="agent-title">PRD 文档 Agent</div>
            <div className="agent-row">
              <div className="form-group">
                <label>提供商</label>
                <select
                  value={form.prdProvider}
                  onChange={(e) => {
                    const provider = e.target.value as LLMProvider;
                    setForm({
                      ...form,
                      prdProvider: provider,
                      prdModel: normalizeModel(provider, form.prdModel),
                    });
                  }}
                >
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>模型</label>
                <select
                  value={form.prdModel}
                  onChange={(e) => setForm({ ...form, prdModel: e.target.value })}
                >
                  {getModelOptions(form.prdProvider, form.prdModel).map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="agent-section">
            <div className="agent-title">用户画像 Agent</div>
            <div className="agent-row">
              <div className="form-group">
                <label>提供商</label>
                <select
                  value={form.personaProvider}
                  onChange={(e) => {
                    const provider = e.target.value as LLMProvider;
                    setForm({
                      ...form,
                      personaProvider: provider,
                      personaModel: normalizeModel(provider, form.personaModel),
                    });
                  }}
                >
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>模型</label>
                <select
                  value={form.personaModel}
                  onChange={(e) => setForm({ ...form, personaModel: e.target.value })}
                >
                  {getModelOptions(form.personaProvider, form.personaModel).map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>TTS 语音</label>
            <div className="tts-row">
              <select
                value={form.voiceId}
                onChange={(e) => setForm({ ...form, voiceId: e.target.value })}
              >
                {VOICE_OPTIONS.map((voice) => (
                  <option
                    key={voice.value}
                    value={voice.value}
                    disabled={UNAVAILABLE_VOICES.has(voice.value)}
                  >
                    {voice.label} - {voice.desc}{UNAVAILABLE_VOICES.has(voice.value) ? '（暂不可用）' : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="tts-preview-btn"
                onClick={handlePreviewVoice}
                disabled={isPreviewing}
              >
                {isPreviewing ? '播放中...' : '播放'}
              </button>
            </div>
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

          <div className="scenario-section">
            <button
              type="button"
              className="section-toggle"
              onClick={() => setShowReflectionSettings(!showReflectionSettings)}
            >
              {showReflectionSettings ? '▼' : '▶'} AI 复盘场景配置
            </button>

            {showReflectionSettings && (
              <div className="scenario-prompts">
                <div className="form-group">
                  <label>复盘 Agent 提示词</label>
                  <textarea
                    value={form.scenarioPrompts?.reflectionPrompt || aiDailyReflectionScenario.interviewPrompt}
                    onChange={(e) => setForm({
                      ...form,
                      scenarioPrompts: { ...form.scenarioPrompts, reflectionPrompt: e.target.value }
                    })}
                    rows={6}
                  />
                </div>
                <div className="form-group">
                  <label>复盘记录 Agent 提示词</label>
                  <textarea
                    value={
                      form.scenarioPrompts?.reflectionReportPrompt
                      || aiDailyReflectionScenario.outputs[0]?.generatorPrompt
                    }
                    onChange={(e) => setForm({
                      ...form,
                      scenarioPrompts: { ...form.scenarioPrompts, reflectionReportPrompt: e.target.value }
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
