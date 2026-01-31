import type { InfoProgress } from '../types/transcript';
import './InterviewProgress.css';

interface InterviewProgressProps {
  progress: InfoProgress;
  isInterviewing: boolean;
}

export function InterviewProgress({ progress, isInterviewing }: InterviewProgressProps) {
  if (!isInterviewing && progress.percentage === 0) {
    return null;
  }

  const collectedCount = progress.items.filter(item => item.collected).length;
  const totalCount = progress.items.length;

  return (
    <div className="interview-progress">
      <div className="progress-header">
        <span className="progress-title">采访进度</span>
        <span className="progress-percentage">{progress.percentage}%</span>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      <div className="progress-details">
        <span className="progress-count">
          已收集 {collectedCount}/{totalCount} 项信息
        </span>
      </div>
      {progress.items.length > 0 && (
        <div className="progress-items">
          {progress.items.map(item => (
            <span
              key={item.id}
              className={`progress-item ${item.collected ? 'collected' : ''}`}
              title={item.label}
            >
              {item.collected ? '✓' : '○'} {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
