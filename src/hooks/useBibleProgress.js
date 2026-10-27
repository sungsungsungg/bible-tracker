import { useEffect, useState } from 'react';
import {
  getLocalDateKey,
  getNextPosition,
  initialPosition,
  updateChapterHistory,
} from '../utils/readingProgress.js';

export function useBibleProgress(books) {
  const [readChapters, setReadChapters] = useState({});
  const [dailyHistory, setDailyHistory] = useState({});
  const [currentPosition, setCurrentPosition] = useState(initialPosition);
  const [isHydrated, setIsHydrated] = useState(false);
  const [canPersist, setCanPersist] = useState(false);
  const [persistenceStatus, setPersistenceStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      try {
        const response = await fetch('/api/progress');
        if (!response.ok) throw new Error('진행 기록을 불러오지 못했습니다.');
        const progress = await response.json();
        if (cancelled) return;

        setReadChapters(progress.readChapters);
        setDailyHistory(progress.dailyHistory ?? {});
        setCurrentPosition(progress.currentPosition);
        setCanPersist(true);
        setPersistenceStatus('saved');
      } catch {
        if (!cancelled) setPersistenceStatus('error');
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    }

    loadProgress();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || !canPersist) return undefined;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setPersistenceStatus('saving');
      try {
        const response = await fetch('/api/progress', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ readChapters, currentPosition, dailyHistory }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('진행 기록을 저장하지 못했습니다.');
        setPersistenceStatus('saved');
      } catch {
        if (!controller.signal.aborted) setPersistenceStatus('error');
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [readChapters, currentPosition, dailyHistory, isHydrated, canPersist]);

  function updateCurrentBook(bookId) {
    setCurrentPosition({ bookId, chapter: 1 });
  }

  function updateCurrentChapter(chapter) {
    setCurrentPosition((position) => ({ ...position, chapter: Number(chapter) }));
  }

  function moveCurrentPosition(direction) {
    const nextPosition = getNextPosition(currentPosition, direction, books);
    if (nextPosition) setCurrentPosition(nextPosition);
    return nextPosition;
  }

  function toggleReadChapter(bookId, chapter) {
    const chapters = readChapters[bookId] ?? [];
    const alreadyRead = chapters.includes(chapter);
    const updatedChapters = alreadyRead
      ? chapters.filter((readChapter) => readChapter !== chapter)
      : [...chapters, chapter].sort((first, second) => first - second);

    setReadChapters((previous) => ({ ...previous, [bookId]: updatedChapters }));
    setDailyHistory((history) =>
      updateChapterHistory(history, bookId, chapter, !alreadyRead, getLocalDateKey()),
    );
    return alreadyRead;
  }

  function markCurrentChapterRead() {
    const book = books.find((item) => item.id === currentPosition.bookId) ?? books[0];
    const chapter = currentPosition.chapter;
    const chapters = readChapters[book.id] ?? [];
    if (!chapters.includes(chapter)) {
      setReadChapters((previous) => ({
        ...previous,
        [book.id]: [...chapters, chapter].sort((first, second) => first - second),
      }));
      setDailyHistory((history) =>
        updateChapterHistory(history, book.id, chapter, true, getLocalDateKey()),
      );
    }

    const bookIndex = books.findIndex((item) => item.id === book.id);
    const nextPosition =
      chapter === book.chapters
        ? books[bookIndex + 1]
          ? { bookId: books[bookIndex + 1].id, chapter: 1 }
          : null
        : { bookId: book.id, chapter: chapter + 1 };
    if (nextPosition) setCurrentPosition(nextPosition);
    return { book, chapter, nextPosition };
  }

  async function restoreProgress(progress) {
    setCanPersist(false);
    setPersistenceStatus('saving');
    try {
      const response = await fetch('/api/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progress),
      });
      const restored = await response.json();
      if (!response.ok) throw new Error(restored.error ?? '백업을 복원하지 못했습니다.');

      setReadChapters(restored.readChapters);
      setDailyHistory(restored.dailyHistory ?? {});
      setCurrentPosition(restored.currentPosition);
      setPersistenceStatus('saved');
      return restored;
    } catch (error) {
      setPersistenceStatus('error');
      throw error;
    } finally {
      setCanPersist(true);
    }
  }

  return {
    readChapters,
    dailyHistory,
    currentPosition,
    isHydrated,
    canPersist,
    persistenceStatus,
    updateCurrentBook,
    updateCurrentChapter,
    moveCurrentPosition,
    toggleReadChapter,
    markCurrentChapterRead,
    restoreProgress,
  };
}
