import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { BookOpen, CircleCheck } from 'lucide-react';
import books from '../data/books.json';
import BackupControls from './components/BackupControls.jsx';
import BookListPanel from './components/BookListPanel.jsx';
import MonthlyReadingCalendar from './components/MonthlyReadingCalendar.jsx';
import ProgressOverview from './components/ProgressOverview.jsx';
import ReadingPanel from './components/ReadingPanel.jsx';
import ReadingRhythm from './components/ReadingRhythm.jsx';
import { useBibleProgress } from './hooks/useBibleProgress.js';
import { useAppRoute } from './hooks/useAppRoute.js';
import { useProgressBackup } from './hooks/useProgressBackup.js';
import { buildReadingSummary, getLocalDateKey } from './utils/readingProgress.js';

const NotesPage = lazy(() => import('./components/NotesPage.jsx'));

function App() {
  const { route, navigate } = useAppRoute();
  const isCalendarPage = route === '/calendar';
  const isNotesPage = route === '/notes';
  const isDashboardPage = !isCalendarPage && !isNotesPage;
  const progress = useBibleProgress(books);
  const {
    readChapters,
    dailyHistory,
    currentPosition,
    isHydrated,
    canPersist,
    persistenceStatus,
    updateCurrentBook: updateProgressBook,
    updateCurrentChapter,
    moveCurrentPosition: moveProgressPosition,
    toggleReadChapter: toggleProgressChapter,
    markCurrentChapterRead: markProgressChapterRead,
    restoreProgress,
  } = progress;
  const [selectedBookId, setSelectedBookId] = useState('GEN');
  const [testamentFilter, setTestamentFilter] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (isHydrated) setSelectedBookId(currentPosition.bookId);
  }, [isHydrated, currentPosition.bookId]);

  const selectedBook = books.find((book) => book.id === selectedBookId) ?? books[0];
  const currentBook = books.find((book) => book.id === currentPosition.bookId) ?? books[0];
  const todayKey = getLocalDateKey();
  const {
    totalChapters,
    completedChapters,
    completedBooks,
    progressPercent,
    recentDays,
    readingStreak,
    recentChapterCount,
  } = buildReadingSummary(readChapters, dailyHistory, books, todayKey);

  const visibleBooks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('ko-KR');
    return books.filter((book) => {
      const matchesTestament = testamentFilter === '전체' || book.testament === testamentFilter;
      const matchesSearch =
        !normalizedSearch || book.name.toLocaleLowerCase('ko-KR').includes(normalizedSearch);
      return matchesTestament && matchesSearch;
    });
  }, [searchTerm, testamentFilter]);

  function showNotice(message, duration = 2600) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), duration);
  }

  const { exportProgress, importProgress } = useProgressBackup({
    currentPosition,
    readChapters,
    dailyHistory,
    restoreProgress,
    onRestored: (restored) => setSelectedBookId(restored.currentPosition.bookId),
    onNotice: showNotice,
  });

  function chooseBook(bookId) {
    setSelectedBookId(bookId);
  }

  function updateCurrentBook(bookId) {
    updateProgressBook(bookId);
    setSelectedBookId(bookId);
  }

  function toggleReadChapter(bookId, chapter) {
    const alreadyRead = toggleProgressChapter(bookId, chapter);
    showNotice(
      `${books.find((book) => book.id === bookId).name} ${chapter}장이 ${alreadyRead ? '읽음 취소' : '읽음으로 표시'}되었습니다.`,
    );
  }

  function markCurrentChapterRead() {
    const { book, chapter, nextPosition } = markProgressChapterRead();
    if (nextPosition) setSelectedBookId(nextPosition.bookId);
    showNotice(`${book.name} ${chapter}장을 읽음으로 표시했습니다.`);
  }

  function moveCurrentPosition(direction) {
    const nextPosition = moveProgressPosition(direction);
    if (nextPosition) setSelectedBookId(nextPosition.bookId);
  }

  const today = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="/"
          aria-label="말씀길 홈"
          onClick={(event) => navigate(event, '/')}
        >
          <span className="brand-mark">
            <BookOpen size={21} strokeWidth={1.8} />
          </span>
          <span className="brand-name">말씀길</span>
        </a>
        <nav className="primary-nav" aria-label="주요 메뉴">
          <a
            href="/"
            className={isDashboardPage ? 'active' : ''}
            aria-current={isDashboardPage ? 'page' : undefined}
            onClick={(event) => navigate(event, '/')}
          >
            읽기 현황
          </a>
          <a
            href="/calendar"
            className={isCalendarPage ? 'active' : ''}
            aria-current={isCalendarPage ? 'page' : undefined}
            onClick={(event) => navigate(event, '/calendar')}
          >
            읽기 달력
          </a>
          <a
            href="/notes"
            className={isNotesPage ? 'active' : ''}
            aria-current={isNotesPage ? 'page' : undefined}
            onClick={(event) => navigate(event, '/notes')}
          >
            말씀 노트
          </a>
        </nav>
        <div className="topbar-right">
          <span className="today-label">{today}</span>
          <span className="avatar" aria-label="내 기록">
            나
          </span>
        </div>
      </header>

      <main
        id="top"
        className={`page-content ${isCalendarPage ? 'calendar-page' : ''} ${isNotesPage ? 'notes-page' : ''}`}
      >
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">
              {isNotesPage
                ? '생각을 담는 자리'
                : isCalendarPage
                  ? '나의 읽기 기록'
                  : '나의 성경 읽기'}
            </p>
            <h1 id="page-title">
              {isNotesPage
                ? '말씀을 읽고, 마음에 남기다'
                : isCalendarPage
                  ? '날짜마다 쌓인 말씀의 여정'
                  : '읽음은 차곡차곡, 다음 장으로'}
            </h1>
          </div>
          <div className="heading-mark" aria-hidden="true">
            말씀을 따라
          </div>
        </section>

        {isNotesPage ? (
          <Suspense
            fallback={
              <div className="notes-loading" role="status">
                노트 편집기를 여는 중...
              </div>
            }
          >
            <NotesPage />
          </Suspense>
        ) : isCalendarPage ? (
          <MonthlyReadingCalendar dailyHistory={dailyHistory} />
        ) : (
          <>
            <ProgressOverview
              totalChapters={totalChapters}
              completedChapters={completedChapters}
              completedBooks={completedBooks}
              progressPercent={progressPercent}
            />
            <ReadingRhythm
              todayKey={todayKey}
              recentDays={recentDays}
              recentChapterCount={recentChapterCount}
              readingStreak={readingStreak}
            />
            <div className="workspace-grid">
              <BookListPanel
                books={visibleBooks}
                readChapters={readChapters}
                selectedBookId={selectedBookId}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                testamentFilter={testamentFilter}
                onTestamentChange={setTestamentFilter}
                onSelectBook={chooseBook}
              />
              <ReadingPanel
                books={books}
                selectedBook={selectedBook}
                currentBook={currentBook}
                currentPosition={currentPosition}
                readChapters={readChapters}
                onCurrentBookChange={updateCurrentBook}
                onCurrentChapterChange={updateCurrentChapter}
                onMoveCurrentPosition={moveCurrentPosition}
                onMarkCurrentRead={markCurrentChapterRead}
                onToggleReadChapter={toggleReadChapter}
                onSelectBook={chooseBook}
              />
            </div>
          </>
        )}
        {!isNotesPage && (
          <footer className="page-footer">
            <span>말씀길</span>
            <BackupControls
              status={persistenceStatus}
              disabled={!isHydrated || !canPersist}
              onExport={exportProgress}
              onImport={importProgress}
            />
          </footer>
        )}
      </main>
      {notice && (
        <div className="toast" role="status">
          <CircleCheck size={17} />
          {notice}
        </div>
      )}
    </div>
  );
}

export default App;
