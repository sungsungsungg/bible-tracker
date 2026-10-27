import React from 'react';
import { BookOpen, CircleCheck } from 'lucide-react';

export default function ProgressOverview({
  totalChapters,
  completedChapters,
  completedBooks,
  progressPercent,
}) {
  return (
    <section className="overview" aria-label="전체 진행 현황">
      <div className="overview-main">
        <div className="overview-title-row">
          <div>
            <p className="overview-kicker">전체 진행률</p>
            <p className="overview-count">
              <strong>{completedChapters.toLocaleString('ko-KR')}</strong>
              <span> / {totalChapters.toLocaleString('ko-KR')}장</span>
            </p>
          </div>
          <div
            className="progress-ring"
            style={{
              background: `conic-gradient(var(--mint) ${progressPercent}%, rgba(255,255,255,.16) 0)`,
            }}
          >
            <div className="progress-ring-inner">
              <strong>
                {progressPercent.toFixed(1)}
                <small>%</small>
              </strong>
            </div>
          </div>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="성경 전체 읽기 진행률"
          aria-valuenow={completedChapters}
          aria-valuemin={0}
          aria-valuemax={totalChapters}
        >
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="overview-footer">
          <span>창세기부터 요한계시록까지</span>
          <span>{completedBooks}권 완독</span>
        </div>
      </div>
      <div className="overview-stats">
        <div className="stat-item">
          <span className="stat-icon stat-icon-mint">
            <CircleCheck size={18} />
          </span>
          <div>
            <span className="stat-label">읽은 장</span>
            <strong>
              {completedChapters.toLocaleString('ko-KR')}
              <small>장</small>
            </strong>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon stat-icon-coral">
            <BookOpen size={18} />
          </span>
          <div>
            <span className="stat-label">남은 장</span>
            <strong>
              {(totalChapters - completedChapters).toLocaleString('ko-KR')}
              <small>장</small>
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}
