import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from './ChatHistory';
import './CenterChat.css';

interface CenterChatProps {
  messages: Message[];
}

export function CenterChat({ messages }: CenterChatProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="center-chat" ref={containerRef}>
      <div className="center-chat-inner">
        {messages.map((msg) => (
          <div key={msg.id} className={`center-message ${msg.role}`}>
            <span className="center-role">{msg.role === 'user' ? '我' : 'AI'}</span>
            <div className="center-content">
              {msg.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
