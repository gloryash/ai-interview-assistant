import { useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import './ChatHistory.css';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatHistoryProps {
  messages: Message[];
}

export function ChatHistory({ messages }: ChatHistoryProps) {
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const exportToMarkdown = useCallback(() => {
    const content = messages.map((msg) => {
      const role = msg.role === 'user' ? '**用户**' : '**AI**';
      return `${role}\n\n${msg.content}\n`;
    }).join('\n---\n\n');

    const header = `# 对话记录\n\n导出时间: ${new Date().toLocaleString()}\n\n---\n\n`;
    const blob = new Blob([header + content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  return (
    <div className="chat-history">
      <div className="chat-history-header">
        <h3>对话记录</h3>
        <button
          className="export-btn"
          onClick={exportToMarkdown}
          disabled={messages.length === 0}
          title="导出为 Markdown"
        >
          导出
        </button>
      </div>
      <div className="messages" ref={messagesRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="role">{msg.role === 'user' ? '用户' : 'AI'}</div>
            <div className="content markdown-content">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
