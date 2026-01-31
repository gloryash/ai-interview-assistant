import { useCallback, useRef, useState } from 'react';
import type { ScenarioConfig } from '../types/scenario';
import type { InterviewTranscript, GeneratedDocument, InfoProgress } from '../types/transcript';
import type { ChatProvider } from '../services/chat/ChatProvider';
import { InterviewEngine } from '../services/interview/InterviewEngine';
import { InterviewStage } from '../services/interview/InterviewStateMachine';
import { DocumentGenerator } from '../services/document/DocumentGenerator';
import { ProgressTracker } from '../services/interview/ProgressTracker';

export interface UseInterviewConfig {
  scenario: ScenarioConfig;
  chatProvider?: ChatProvider;
  getDocumentChatProvider?: (outputId: string) => ChatProvider | undefined;
}

export interface GeneratingProgress {
  currentDoc: string;
  charCount: number;
}

export interface UseInterviewReturn {
  stage: InterviewStage;
  transcript: InterviewTranscript | null;
  documents: GeneratedDocument[];
  isGenerating: boolean;
  generatingProgress: GeneratingProgress | null;
  infoProgress: InfoProgress;
  start: () => void;
  addUserMessage: (content: string) => void;
  updateUserMessage: (content: string) => void;
  addAssistantMessage: (content: string) => void;
  nextStage: () => void;
  finish: () => void;
  generateDocuments: () => Promise<void>;
  reset: () => void;
}

export function useInterview(config: UseInterviewConfig): UseInterviewReturn {
  const [stage, setStage] = useState<InterviewStage>(InterviewStage.NOT_STARTED);
  const [transcript, setTranscript] = useState<InterviewTranscript | null>(null);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState<GeneratingProgress | null>(null);
  const [infoProgress, setInfoProgress] = useState<InfoProgress>({ items: [], percentage: 0 });

  const engineRef = useRef<InterviewEngine | null>(null);
  const generatorRef = useRef<DocumentGenerator | null>(null);
  const progressTrackerRef = useRef<ProgressTracker | null>(null);

  // 初始化引擎
  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new InterviewEngine({
        scenario: config.scenario,
        chatProvider: config.chatProvider,
        onStageChange: setStage,
        onTranscriptUpdate: setTranscript,
      });
    }
    return engineRef.current;
  }, [config.scenario, config.chatProvider]);

  // 初始化文档生成器
  const getGenerator = useCallback(() => {
    if (!generatorRef.current) {
      generatorRef.current = new DocumentGenerator();
    }
    return generatorRef.current;
  }, []);

  // 初始化进度追踪器
  const getProgressTracker = useCallback(() => {
    if (!progressTrackerRef.current) {
      progressTrackerRef.current = new ProgressTracker();
    }
    return progressTrackerRef.current;
  }, []);

  const start = useCallback(() => {
    getEngine().start();
    // 初始化进度（只有 ai-interview 场景才有进度追踪）
    if (config.scenario.id === 'ai-interview') {
      const tracker = getProgressTracker();
      setInfoProgress(tracker.getProgress());
    }
  }, [getEngine, getProgressTracker, config.scenario.id]);

  const addUserMessage = useCallback((content: string) => {
    getEngine().addUserMessage(content);
    // 只有 ai-interview 场景才更新进度
    if (config.scenario.id === 'ai-interview') {
      const engine = getEngine();
      const tracker = getProgressTracker();
      const progress = tracker.analyzeMessages(engine.getTranscript().messages);
      setInfoProgress(progress);
    }
  }, [getEngine, getProgressTracker, config.scenario.id]);

  const updateUserMessage = useCallback((content: string) => {
    getEngine().updateLastUserMessage(content);
    if (config.scenario.id === 'ai-interview') {
      const engine = getEngine();
      const tracker = getProgressTracker();
      const progress = tracker.analyzeMessages(engine.getTranscript().messages);
      setInfoProgress(progress);
    }
  }, [getEngine, getProgressTracker, config.scenario.id]);

  const addAssistantMessage = useCallback((content: string) => {
    getEngine().addAssistantMessage(content);
  }, [getEngine]);

  const nextStage = useCallback(() => {
    getEngine().nextStage();
  }, [getEngine]);

  const finish = useCallback(() => {
    getEngine().finish();
  }, [getEngine]);

  const generateDocuments = useCallback(async () => {
    const currentTranscript = getEngine().getTranscript();
    if (!currentTranscript) return;

    setIsGenerating(true);
    const generator = getGenerator();
    const results: GeneratedDocument[] = [];

    try {
      for (const output of config.scenario.outputs) {
        setGeneratingProgress({ currentDoc: output.name, charCount: 0 });
        const provider = config.getDocumentChatProvider?.(output.id) || config.chatProvider;
        if (!provider) {
          throw new Error(`No chat provider configured for output: ${output.id}`);
        }
        const doc = await generator.generateOne(
          currentTranscript,
          output,
          provider,
          undefined,
          (charCount) => setGeneratingProgress({ currentDoc: output.name, charCount })
        );
        results.push(doc);
        setDocuments([...results]);
      }
    } catch (error) {
      console.error('Document generation failed', error);
    } finally {
      setGeneratingProgress(null);
      setIsGenerating(false);
    }
  }, [
    config.scenario.outputs,
    config.getDocumentChatProvider,
    config.chatProvider,
    getEngine,
    getGenerator,
  ]);

  const reset = useCallback(() => {
    getEngine().reset();
    getProgressTracker().reset();
    setDocuments([]);
    setInfoProgress({ items: [], percentage: 0 });
  }, [getEngine, getProgressTracker]);

  return {
    stage,
    transcript,
    documents,
    isGenerating,
    generatingProgress,
    infoProgress,
    start,
    addUserMessage,
    updateUserMessage,
    addAssistantMessage,
    nextStage,
    finish,
    generateDocuments,
    reset,
  };
}
