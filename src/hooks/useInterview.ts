import { useCallback, useRef, useState } from 'react';
import type { ScenarioConfig } from '../types/scenario';
import type { InterviewTranscript, GeneratedDocument } from '../types/transcript';
import type { ChatProvider } from '../services/chat/ChatProvider';
import { InterviewEngine } from '../services/interview/InterviewEngine';
import { InterviewStage } from '../services/interview/InterviewStateMachine';
import { DocumentGenerator } from '../services/document/DocumentGenerator';

export interface UseInterviewConfig {
  scenario: ScenarioConfig;
  chatProvider: ChatProvider;
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
  start: () => void;
  addUserMessage: (content: string) => void;
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

  const engineRef = useRef<InterviewEngine | null>(null);
  const generatorRef = useRef<DocumentGenerator | null>(null);

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
      generatorRef.current = new DocumentGenerator({
        chatProvider: config.chatProvider,
      });
    }
    return generatorRef.current;
  }, [config.chatProvider]);

  const start = useCallback(() => {
    getEngine().start();
  }, [getEngine]);

  const addUserMessage = useCallback((content: string) => {
    getEngine().addUserMessage(content);
  }, [getEngine]);

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

    for (const output of config.scenario.outputs) {
      setGeneratingProgress({ currentDoc: output.name, charCount: 0 });
      const doc = await generator.generateOne(
        currentTranscript,
        output,
        undefined,
        (charCount) => setGeneratingProgress({ currentDoc: output.name, charCount })
      );
      results.push(doc);
      setDocuments([...results]);
    }

    setGeneratingProgress(null);
    setIsGenerating(false);
  }, [config.scenario.outputs, getEngine, getGenerator]);

  const reset = useCallback(() => {
    getEngine().reset();
    setDocuments([]);
  }, [getEngine]);

  return {
    stage,
    transcript,
    documents,
    isGenerating,
    generatingProgress,
    start,
    addUserMessage,
    addAssistantMessage,
    nextStage,
    finish,
    generateDocuments,
    reset,
  };
}
