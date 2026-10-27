import React from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ReadingPanel({
  books,
  selectedBook,
  currentBook,
  currentPosition,
  readChapters,
  onCurrentBookChange,
  onCurrentChapterChange,
  onMoveCurrentPosition,
  onMarkCurrentRead,
  onToggleReadChapter,
  onSelectBook,
}) {
  return (
    <section className="reading-panel" aria-label="책별 읽기 기록">
      <div className="current-location">
        <div className="location-copy">
          <span className="location-label">
            <span className="live-dot" />
            현재 읽는 위치
          </span>
          <div className="location-selects">
            <label className="select-wrap">
              <span className="sr-only">현재 읽는 책</span>
              <select
                value={currentPosition.bookId}
                onChange={(event) => onCurrentBookChange(event.target.value)}
              >
                {books.map((book) => (
                  <option value={book.id} key={book.id}>
                    {book.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </label>
            <label className="select-wrap chapter-select">
              <span className="sr-only">현재 읽는 장</span>
              <select
                value={currentPosition.chapter}
                onChange={(event) => onCurrentChapterChange(event.target.value)}
              >
                {Array.from({ length: currentBook.chapters }, (_, index) => index + 1).map(
                  (chapter) => (
                    <option value={chapter} key={chapter}>
                      {chapter}장
                    </option>
                  ),
                )}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </label>
          </div>
        </div>
        <div className="location-actions">
          <div className="stepper" aria-label="현재 읽는 장 이동">
            <button
              type="button"
              onClick={() => onMoveCurrentPosition(-1)}
              disabled={currentPosition.bookId === 'GEN' && currentPosition.chapter === 1}
              aria-label="이전 장"
              title="이전 장"
            >
              <ChevronLeft size={17} />
            </button>
            <span>{String(currentPosition.chapter).padStart(2, '0')}</span>
            <button
              type="button"
              onClick={() => onMoveCurrentPosition(1)}
              disabled={
                currentPosition.bookId === 'REV' && currentPosition.chapter === currentBook.chapters
              }
              aria-label="다음 장"
              title="다음 장"
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <button type="button" className="mark-current-button" onClick={onMarkCurrentRead}>
            <Check size={16} /> 현재 장 완료
          </button>
        </div>
      </div>

      <div className="book-detail-heading">
        <div>
          <div className="detail-meta">
            <span>{selectedBook.testament}</span>
            <span className="meta-divider" />
            {selectedBook.chapters}장
          </div>
          <h2>{selectedBook.name}</h2>
        </div>
        <div className="book-detail-progress">
          <strong>{(readChapters[selectedBook.id] ?? []).length}</strong>
          <span> / {selectedBook.chapters}장 읽음</span>
        </div>
      </div>

      <div className="chapter-heading">
        <h3>장별 기록</h3>
        <span>
          <span className="legend-dot" />
          읽은 장
        </span>
      </div>
      <div className="chapter-grid" aria-label={`${selectedBook.name} 장별 읽음 표시`}>
        {Array.from({ length: selectedBook.chapters }, (_, index) => index + 1).map((chapter) => {
          const isRead = (readChapters[selectedBook.id] ?? []).includes(chapter);
          const isCurrent =
            currentPosition.bookId === selectedBook.id && currentPosition.chapter === chapter;
          return (
            <button
              type="button"
              key={chapter}
              className={`chapter-cell ${isRead ? 'read' : ''} ${isCurrent ? 'current' : ''}`}
              onClick={() => onToggleReadChapter(selectedBook.id, chapter)}
              aria-pressed={isRead}
              aria-label={`${selectedBook.name} ${chapter}장 ${isRead ? '읽음, 읽음 취소' : '읽지 않음, 읽음 표시'}`}
              title={`${selectedBook.name} ${chapter}장`}
            >
              {isRead ? <Check size={15} strokeWidth={2.5} /> : <span>{chapter}</span>}
            </button>
          );
        })}
      </div>
      <div className="chapter-footer">
        <span>
          {selectedBook.name} 전체 {selectedBook.chapters}장
        </span>
        <button
          type="button"
          className="jump-current"
          onClick={() => onSelectBook(currentPosition.bookId)}
        >
          현재 위치로 이동 <ChevronRight size={15} />
        </button>
      </div>
    </section>
  );
}
