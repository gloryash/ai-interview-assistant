import type { GeneratedDocument } from '../types/transcript';

interface DocumentPanelProps {
  documents: GeneratedDocument[];
  isGenerating: boolean;
  onGenerate: () => void;
  onViewDocuments?: () => void;
  disabled?: boolean;
}

export function DocumentPanel({ documents, isGenerating, onGenerate, onViewDocuments, disabled }: DocumentPanelProps) {
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
    <div className="document-panel">
      <h3>生成文档</h3>
      <button onClick={onGenerate} disabled={isGenerating || disabled}>
        {disabled ? '请先结束采访' : isGenerating ? '生成中...' : '生成文档'}
      </button>

      {documents.length > 0 && (
        <div className="document-list">
          <button className="view-btn" onClick={onViewDocuments}>查看文档</button>
          {documents.map((doc) => (
            <div key={doc.outputId} className="document-item">
              <span className="doc-name">{doc.name}</span>
              <button onClick={() => handleExport(doc)}>导出</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
