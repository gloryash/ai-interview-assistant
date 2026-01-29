import type { InterviewTranscript } from '../types/transcript';

interface TranscriptPanelProps {
  transcript: InterviewTranscript | null;
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  if (!transcript || transcript.messages.length === 0) {
    return (
      <div className="transcript-panel">
        <h3>访谈记录</h3>
        <p className="empty">暂无记录</p>
      </div>
    );
  }

  return (
    <div className="transcript-panel">
      <h3>访谈记录</h3>
      <div className="transcript-messages">
        {transcript.messages.map((msg, idx) => (
          <div key={idx} className={`transcript-msg ${msg.role}`}>
            <span className="role">{msg.role === 'user' ? '用户' : 'AI'}:</span>
            <span className="content">{msg.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
