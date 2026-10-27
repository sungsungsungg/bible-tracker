import React from 'react';
import { Flame } from 'lucide-react';

export default function ReadingRhythm({ todayKey, recentDays, recentChapterCount, readingStreak }) {
  return (
    <section className="reading-rhythm" aria-label="최근 읽기 활동">
      <div className="rhythm-summary">
        <div className="rhythm-title">
          <Flame size={17} aria-hidden="true" />
          <h2>읽기 리듬</h2>
        </div>
        <p className="rhythm-streak">
          <strong>{readingStreak}</strong>일 연속
        </p>
        <p className="rhythm-week-total">
          최근 7일 <strong>{recentChapterCount}장</strong>
        </p>
      </div>
      <div
        className="rhythm-days"
        aria-label={`최근 7일 동안 ${recentChapterCount}장을 읽었습니다`}
      >
        {recentDays.map((day) => (
          <div
            className={`rhythm-day ${day.dateKey === todayKey ? 'today' : ''}`}
            key={day.dateKey}
            title={`${day.dateKey}: ${day.count}장`}
            aria-label={`${day.dateKey} ${day.count}장`}
          >
            <span className="rhythm-day-label">{day.label}</span>
            <span className="rhythm-bar">
              <span
                className={day.count > 0 ? 'active' : ''}
                style={{ height: `${day.count > 0 ? Math.min(100, 25 + day.count * 12) : 5}%` }}
              />
            </span>
            <span className="rhythm-day-count">{day.count > 0 ? `${day.count}장` : '·'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
