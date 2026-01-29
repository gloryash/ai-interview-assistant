import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { GeneratedDocument } from '../types/transcript';
import './DocumentViewer.css';

interface DocumentViewerProps {
  documents: GeneratedDocument[];
  onClose: () => void;
}

export function DocumentViewer({ documents, onClose }: DocumentViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (documents.length === 0) return null;

  const activeDoc = documents[activeIndex];

  const handleExport = (doc: GeneratedDocument) => {
    const blob = new Blob([doc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="document-viewer-overlay">
      <div className="document-viewer">
        <div className="document-viewer-header">
          <h2>生成的文档</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="document-tabs">
          {documents.map((doc, idx) => (
            <button
              key={doc.outputId}
              className={`tab ${idx === activeIndex ? 'active' : ''}`}
              onClick={() => setActiveIndex(idx)}
            >
              {doc.name}
            </button>
          ))}
        </div>
        <div className="document-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeDoc.content}</ReactMarkdown>
        </div>
        <div className="document-viewer-footer">
          <button onClick={() => handleExport(activeDoc)}>导出当前文档</button>
        </div>
      </div>
    </div>
  );
}
