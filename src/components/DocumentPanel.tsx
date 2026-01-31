import { useState } from 'react';
import type { GeneratedDocument } from '../types/transcript';
import { uploadToFeishu, checkFeishuServer } from '../services/feishu/FeishuUploader';

interface DocumentPanelProps {
  documents: GeneratedDocument[];
  isGenerating: boolean;
  onGenerate: () => void;
  onViewDocuments?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function DocumentPanel({
  documents,
  isGenerating,
  onGenerate,
  onViewDocuments,
  disabled,
  disabledReason,
}: DocumentPanelProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadResults, setUploadResults] = useState<Record<string, { url?: string; error?: string }>>({});

  const buttonLabel = disabled
    ? disabledReason || '请先结束采访'
    : isGenerating
      ? '生成中...'
      : '生成文档';

  const handleExport = (doc: GeneratedDocument) => {
    const blob = new Blob([doc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadToFeishu = async (doc: GeneratedDocument) => {
    const serverOk = await checkFeishuServer();
    if (!serverOk) {
      alert('飞书服务未启动，请先运行: npm run feishu');
      return;
    }

    setUploadingId(doc.outputId);
    try {
      const result = await uploadToFeishu(doc.content);
      if (result.success && result.url) {
        setUploadResults(prev => ({ ...prev, [doc.outputId]: { url: result.url } }));
        window.open(result.url, '_blank');
      } else {
        setUploadResults(prev => ({ ...prev, [doc.outputId]: { error: result.error } }));
        alert(`上传失败: ${result.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      setUploadResults(prev => ({ ...prev, [doc.outputId]: { error: msg } }));
      alert(`上传失败: ${msg}`);
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="document-panel">
      <h3>生成文档</h3>
      <button onClick={onGenerate} disabled={isGenerating || disabled}>
        {buttonLabel}
      </button>

      {documents.length > 0 && (
        <div className="document-list">
          <button className="view-btn" onClick={onViewDocuments}>查看文档</button>
          {documents.map((doc) => (
            <div key={doc.outputId} className="document-item">
              <span className="doc-name">{doc.name}</span>
              <div className="doc-actions">
                <button onClick={() => handleExport(doc)}>导出</button>
                {uploadResults[doc.outputId]?.url ? (
                  <a href={uploadResults[doc.outputId].url} target="_blank" rel="noopener" className="feishu-link-btn">
                    查看飞书文档
                  </a>
                ) : (
                  <button
                    onClick={() => handleUploadToFeishu(doc)}
                    disabled={uploadingId === doc.outputId}
                  >
                    {uploadingId === doc.outputId ? '上传中...' : '上传飞书'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
