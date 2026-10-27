export const initialPosition = { bookId: 'GEN', chapter: 1 };

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDateKey(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function shiftMonthKey(monthKey, months) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function buildMonthCalendar(monthKey, dailyHistory) {
  const [year, month] = monthKey.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const gridStart = new Date(year, month - 1, 1 - firstDay.getDay());
  const dayCount = new Date(year, month, 0).getDate();
  const cellCount = Math.ceil((firstDay.getDay() + dayCount) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = getLocalDateKey(date);
    const chaptersByBook = dailyHistory[dateKey] ?? {};
    return {
      dateKey,
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month - 1,
      chaptersByBook,
      chapterCount: Object.values(chaptersByBook).reduce(
        (total, chapters) => total + chapters.length,
        0,
      ),
    };
  });
}

export function getDailyChapterCount(history, dateKey) {
  return Object.values(history[dateKey] ?? {}).reduce(
    (total, chapters) => total + chapters.length,
    0,
  );
}

export function buildReadingSummary(
  readChapters,
  dailyHistory,
  books,
  todayKey = getLocalDateKey(),
) {
  const totalChapters = books.reduce((total, book) => total + book.chapters, 0);
  const completedChapters = Object.values(readChapters).reduce(
    (total, chapters) => total + chapters.length,
    0,
  );
  const completedBooks = books.filter(
    (book) => (readChapters[book.id] ?? []).length === book.chapters,
  ).length;
  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const dateKey = shiftDateKey(todayKey, index - 6);
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    return {
      dateKey,
      label: new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'UTC' }).format(date),
      day: dateKey.slice(8),
      count: getDailyChapterCount(dailyHistory, dateKey),
    };
  });

  let streakDate =
    getDailyChapterCount(dailyHistory, todayKey) > 0 ? todayKey : shiftDateKey(todayKey, -1);
  let readingStreak = 0;
  while (getDailyChapterCount(dailyHistory, streakDate) > 0) {
    readingStreak += 1;
    streakDate = shiftDateKey(streakDate, -1);
  }

  return {
    totalChapters,
    completedChapters,
    completedBooks,
    progressPercent: (completedChapters / totalChapters) * 100,
    recentDays,
    readingStreak,
    recentChapterCount: recentDays.reduce((total, day) => total + day.count, 0),
  };
}

export function updateChapterHistory(
  history,
  bookId,
  chapter,
  isRead,
  dateKey = getLocalDateKey(),
) {
  if (isRead) {
    const chapters = history[dateKey]?.[bookId] ?? [];
    if (chapters.includes(chapter)) return history;
    return {
      ...history,
      [dateKey]: {
        ...history[dateKey],
        [bookId]: [...chapters, chapter].sort((first, second) => first - second),
      },
    };
  }

  let changed = false;
  const updatedHistory = {};
  for (const [historyDate, booksRead] of Object.entries(history)) {
    const chapters = booksRead[bookId];
    if (!chapters?.includes(chapter)) {
      updatedHistory[historyDate] = booksRead;
      continue;
    }

    changed = true;
    const remainingChapters = chapters.filter((readChapter) => readChapter !== chapter);
    const remainingBooks = { ...booksRead };
    if (remainingChapters.length > 0) remainingBooks[bookId] = remainingChapters;
    else delete remainingBooks[bookId];
    if (Object.keys(remainingBooks).length > 0) updatedHistory[historyDate] = remainingBooks;
  }
  return changed ? updatedHistory : history;
}

export function getNextPosition(position, direction, books) {
  const bookIndex = books.findIndex((book) => book.id === position.bookId);
  const currentBook = books[bookIndex];
  if (!currentBook) return null;

  let nextBook = currentBook;
  let nextChapter = position.chapter + direction;
  if (nextChapter < 1 && bookIndex > 0) {
    nextBook = books[bookIndex - 1];
    nextChapter = nextBook.chapters;
  } else if (nextChapter > currentBook.chapters && bookIndex < books.length - 1) {
    nextBook = books[bookIndex + 1];
    nextChapter = 1;
  } else if (nextChapter < 1 || nextChapter > currentBook.chapters) {
    return null;
  }

  return { bookId: nextBook.id, chapter: nextChapter };
}
