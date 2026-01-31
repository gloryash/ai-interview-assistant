import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRealtimeVoiceChat } from './hooks/useRealtimeVoiceChat';
import { useInterview } from './hooks/useInterview';
import { createChatProvider } from './services/chat/chatProviderFactory';
import { loadConfig, saveConfig, type AppConfig } from './stores/config';
import { SettingsPanel } from './components/SettingsPanel';
import { ChatHistory, type Message } from './components/ChatHistory';
import { CenterChat } from './components/CenterChat';
import { ScenarioSelector } from './components/ScenarioSelector';
import { DocumentPanel } from './components/DocumentPanel';
import { DocumentViewer } from './components/DocumentViewer';
import { ResizableDivider } from './components/ResizableDivider';
import { InterviewProgress } from './components/InterviewProgress';
import { VoiceState } from './services/voice/VoiceStateMachine';
import type { ScenarioConfig } from './types/scenario';
import './App.css';

function App() {
  const [config, setConfig] = useState<AppConfig>(loadConfig);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioConfig | null>(null);
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const lastMsgIdRef = useRef<string | null>(null);

  // 采访引擎（当选择了场景时启用）
  const activeScenario = useMemo(() => {
    if (!selectedScenario) return null;
    const prompts = config.scenarioPrompts;
    if (!prompts) return selectedScenario;

    if (selectedScenario.id === 'ai-interview') {
      return {
        ...selectedScenario,
        interviewPrompt: prompts.interviewPrompt || selectedScenario.interviewPrompt,
        outputs: selectedScenario.outputs.map((output) => {
          if (output.id === 'prd' && prompts.prdPrompt) {
            return { ...output, generatorPrompt: prompts.prdPrompt };
          }
          if (output.id === 'user-persona' && prompts.personaPrompt) {
            return { ...output, generatorPrompt: prompts.personaPrompt };
          }
          return output;
        }),
      };
    }

    if (selectedScenario.id === 'ai-daily-reflection') {
      return {
        ...selectedScenario,
        interviewPrompt: prompts.reflectionPrompt || selectedScenario.interviewPrompt,
        outputs: selectedScenario.outputs.map((output) => {
          if (output.id === 'daily-reflection-report' && prompts.reflectionReportPrompt) {
            return { ...output, generatorPrompt: prompts.reflectionReportPrompt };
          }
          return output;
        }),
      };
    }

    return selectedScenario;
  }, [config.scenarioPrompts, selectedScenario]);

  const interviewSystemPrompt = activeScenario?.interviewPrompt || config.systemPrompt;

  const interviewChatProvider = useMemo(
    () => createChatProvider({
      provider: config.interviewProvider,
      model: config.interviewModel,
      systemPrompt: interviewSystemPrompt,
      claudeApiKey: config.claudeApiKey,
      dashscopeApiKey: config.dashscopeApiKey,
    }),
    [
      config.interviewProvider,
      config.interviewModel,
      config.claudeApiKey,
      config.dashscopeApiKey,
      interviewSystemPrompt,
    ],
  );

  const prdChatProvider = useMemo(
    () => createChatProvider({
      provider: config.prdProvider,
      model: config.prdModel,
      systemPrompt: config.systemPrompt,
      claudeApiKey: config.claudeApiKey,
      dashscopeApiKey: config.dashscopeApiKey,
    }),
    [
      config.prdProvider,
      config.prdModel,
      config.systemPrompt,
      config.claudeApiKey,
      config.dashscopeApiKey,
    ],
  );

  const personaChatProvider = useMemo(
    () => createChatProvider({
      provider: config.personaProvider,
      model: config.personaModel,
      systemPrompt: config.systemPrompt,
      claudeApiKey: config.claudeApiKey,
      dashscopeApiKey: config.dashscopeApiKey,
    }),
    [
      config.personaProvider,
      config.personaModel,
      config.systemPrompt,
      config.claudeApiKey,
      config.dashscopeApiKey,
    ],
  );

  const hasInterviewProvider = Boolean(interviewChatProvider);
  const canGenerateDocs = Boolean(prdChatProvider && personaChatProvider);

  const interview = useInterview(
    activeScenario
      ? {
        scenario: activeScenario,
        chatProvider: interviewChatProvider,
        getDocumentChatProvider: (outputId: string) => {
          if (outputId === 'prd') return prdChatProvider;
          if (outputId === 'user-persona') return personaChatProvider;
          return interviewChatProvider;
        },
      }
      : { scenario: { id: '', name: '', interviewPrompt: '', stages: [], outputs: [] }, chatProvider: interviewChatProvider },
  );

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const id = Date.now().toString();
    lastMsgIdRef.current = id;
    setMessages((prev) => [...prev, { id, role, content }]);
  }, []);

  const updateLastMessage = useCallback((content: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, content: last.content + content }];
    });
  }, []);

  const chat = useRealtimeVoiceChat({
    apiKey: config.dashscopeApiKey,
    voiceId: config.voiceId,
    voiceDisturbEnabled: config.voiceDisturbEnabled,
    chatProvider: interviewChatProvider,
    messageCallbacks: {
      onUserMessage: (text) => {
        addMessage('user', text);
        if (activeScenario) interview.addUserMessage(text);
      },
      onAssistantMessage: (text, isFirst) => {
        if (isFirst) {
          addMessage('assistant', text);
          if (activeScenario) interview.addAssistantMessage(text);
        } else {
          updateLastMessage(text);
        }
      },
      onUpdateUserMessage: (text) => {
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          if (last.role === 'user') {
            return [...prev.slice(0, -1), { ...last, content: text }];
          }
          return prev;
        });
        if (activeScenario) {
          interview.updateUserMessage(text);
        }
      },
    },
    uiCallbacks: { onAlert: (msg) => alert(msg) },
  });

  const handleSaveConfig = useCallback((newConfig: AppConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
  }, []);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    chat.sendTextMessage(inputText.trim());
    setInputText('');
  }, [inputText, chat]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const getStateText = () => {
    switch (chat.voiceState) {
      case VoiceState.LISTENING: return '监听中...';
      case VoiceState.RECORDING: return '录音中...';
      case VoiceState.PROCESSING: return '识别中...';
      default: return '空闲';
    }
  };

  // 开始采访
  const handleStartInterview = useCallback(async () => {
    if (!activeScenario) return;
    setMessages([]);
    interview.reset();
    interview.start();
    setIsInterviewing(true);
    // AI 主动发起对话，同时打开麦克风
    const startPrompt = activeScenario.id === 'ai-daily-reflection'
      ? '请直接开始今天的复盘，并提出第一个问题。'
      : '请直接开始采访，并提出第一个问题。';
    setTimeout(async () => {
      try {
        await chat.sendTextMessage(startPrompt, true);
      } finally {
        if (config.dashscopeApiKey) {
          chat.startListening();
        }
      }
    }, 300);
  }, [activeScenario, interview, chat, config.dashscopeApiKey]);

  // 结束采访
  const handleStopInterview = useCallback(() => {
    interview.finish();
    chat.stopListening();
    chat.stopAll();
    setIsInterviewing(false);
  }, [interview, chat]);

  useEffect(() => {
    if (!hasInterviewProvider) setShowSettings(true);
  }, [hasInterviewProvider]);

  return (
    <div className="app">
      <div className="main-area">
        <header>
          <h1>AI 访谈</h1>
          <div className="header-actions">
            <ScenarioSelector
              selectedId={selectedScenario?.id || null}
              onSelect={(s) => {
                setSelectedScenario(s);
                interview.start();
              }}
              disabled={isInterviewing}
            />
            <button className="settings-btn" onClick={() => setShowSettings(true)}>设置</button>
          </div>
        </header>
        <div className="spacer" />
        <div className="bottom-section">
          <CenterChat messages={messages} />
          {interview.isGenerating && interview.generatingProgress && (
            <div className="generating-status">
              <span className="thinking-icon">⏳</span>
              正在生成「{interview.generatingProgress.currentDoc}」... 已生成 {interview.generatingProgress.charCount} 字
            </div>
          )}
          {interview.documents.length > 0 && !interview.isGenerating && (
            <div className="generated-docs-list">
              <h4>已生成的文档</h4>
              {interview.documents.map((doc) => (
                <div key={doc.outputId} className="generated-doc-item">
                  <span>{doc.name}</span>
                  <div className="doc-actions">
                    <button onClick={() => setShowDocumentViewer(true)}>预览</button>
                    <button onClick={() => {
                      const blob = new Blob([doc.content], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${doc.name}.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}>下载</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="control-panel">
            <div className="status">状态: {getStateText()} {isInterviewing && '| 采访进行中'}</div>
            <div className="buttons">
              {selectedScenario && !isInterviewing && (
                <button onClick={handleStartInterview} disabled={!hasInterviewProvider}>开始采访</button>
              )}
              {isInterviewing && (
                <button onClick={handleStopInterview} className="stop-btn">结束采访</button>
              )}
              <button
                onClick={chat.startListening}
                disabled={chat.voiceState !== VoiceState.IDLE || !config.dashscopeApiKey || !isInterviewing}
              >
                开始语音
              </button>
              <button onClick={chat.stopListening} disabled={!isInterviewing}>停止语音</button>
            </div>
          </div>
          <div className="input-area">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入文字消息..."
              disabled={!hasInterviewProvider}
            />
            <button onClick={handleSend} disabled={!hasInterviewProvider || !inputText.trim()}>发送</button>
          </div>
        </div>
      </div>
      <ResizableDivider onResize={(delta) => setSidebarWidth(w => Math.max(250, Math.min(600, w + delta)))} />
      <aside className="sidebar" style={{ width: sidebarWidth }}>
        <ChatHistory messages={messages} />
        {selectedScenario && (
          <>
            {selectedScenario.id === 'ai-interview' && (
              <InterviewProgress
                progress={interview.infoProgress}
                isInterviewing={isInterviewing}
              />
            )}
            <DocumentPanel
              documents={interview.documents}
              isGenerating={interview.isGenerating}
              onGenerate={interview.generateDocuments}
              onViewDocuments={() => setShowDocumentViewer(true)}
              disabled={isInterviewing || !canGenerateDocs}
              disabledReason={!canGenerateDocs ? '请先配置文档模型' : isInterviewing ? '请先结束采访' : undefined}
            />
          </>
        )}
      </aside>
      {showSettings && <SettingsPanel config={config} onSave={handleSaveConfig} onClose={() => setShowSettings(false)} />}
      {showDocumentViewer && interview.documents.length > 0 && (
        <DocumentViewer
          documents={interview.documents}
          onClose={() => setShowDocumentViewer(false)}
        />
      )}
    </div>
  );
}

export default App;
