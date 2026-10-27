import { describe, expect, it } from 'vitest';
import {
  buildReadingSummary,
  buildMonthCalendar,
  getLocalDateKey,
  getNextPosition,
  shiftMonthKey,
  shiftDateKey,
  updateChapterHistory,
} from '../utils/readingProgress.js';
import {
  getVerseMentions,
  migrateLegacyVerseReference,
  parseTypedVerseReference,
} from '../utils/verseMentions.js';

const books = [
  { id: 'GEN', name: '창세기', chapters: 3 },
  { id: 'EXO', name: '출애굽기', chapters: 2 },
];

describe('reading progress utilities', () => {
  it('formats local dates and shifts dates across month boundaries', () => {
    expect(getLocalDateKey(new Date(2026, 9, 1))).toBe('2026-10-01');
    expect(shiftDateKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDateKey('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('builds a Sunday-first monthly calendar with daily chapter totals', () => {
    const cells = buildMonthCalendar('2026-10', {
      '2026-10-01': { GEN: [1, 2], EXO: [1] },
      '2026-09-30': { GEN: [3] },
    });

    expect(cells).toHaveLength(35);
    expect(cells[0]).toMatchObject({ dateKey: '2026-09-27', isCurrentMonth: false });
    expect(cells.find((cell) => cell.dateKey === '2026-10-01')).toMatchObject({
      isCurrentMonth: true,
      chapterCount: 3,
      chaptersByBook: { GEN: [1, 2], EXO: [1] },
    });
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
  });

  it('summarizes completed chapters, recent activity, and a streak that includes yesterday', () => {
    const history = {
      '2026-10-23': { GEN: [1] },
      '2026-10-24': { GEN: [2, 3] },
      '2026-10-26': { EXO: [1] },
    };
    const summary = buildReadingSummary({ GEN: [1, 2, 3], EXO: [1] }, history, books, '2026-10-26');

    expect(summary).toMatchObject({
      totalChapters: 5,
      completedChapters: 4,
      completedBooks: 1,
      progressPercent: 80,
      readingStreak: 1,
      recentChapterCount: 4,
    });
    expect(summary.recentDays.at(-1)).toMatchObject({ dateKey: '2026-10-26', count: 1 });
  });

  it('removes an undone chapter from every day and drops empty dates', () => {
    const history = {
      '2026-10-25': { GEN: [1, 2] },
      '2026-10-26': { GEN: [1], EXO: [2] },
    };

    expect(updateChapterHistory(history, 'GEN', 1, false)).toEqual({
      '2026-10-25': { GEN: [2] },
      '2026-10-26': { EXO: [2] },
    });
  });

  it('adds a chapter only once to the selected local date', () => {
    const history = { '2026-10-26': { GEN: [2] } };
    const updated = updateChapterHistory(history, 'GEN', 1, true, '2026-10-26');
    const unchanged = updateChapterHistory(updated, 'GEN', 1, true, '2026-10-26');

    expect(updated['2026-10-26'].GEN).toEqual([1, 2]);
    expect(unchanged).toBe(updated);
  });

  it('moves between books at chapter boundaries and stops at the canon ends', () => {
    expect(getNextPosition({ bookId: 'GEN', chapter: 3 }, 1, books)).toEqual({
      bookId: 'EXO',
      chapter: 1,
    });
    expect(getNextPosition({ bookId: 'EXO', chapter: 1 }, -1, books)).toEqual({
      bookId: 'GEN',
      chapter: 3,
    });
    expect(getNextPosition({ bookId: 'GEN', chapter: 1 }, -1, books)).toBeNull();
    expect(getNextPosition({ bookId: 'EXO', chapter: 2 }, 1, books)).toBeNull();
    expect(getNextPosition({ bookId: 'UNKNOWN', chapter: 1 }, 1, books)).toBeNull();
  });
});

describe('inline verse mention utilities', () => {
  it('parses a compact Korean book, chapter, and verse range as it is typed', () => {
    const canon = [
      { id: 'JHN', name: '요한복음', chapters: 21 },
      { id: '1JN', name: '요한일서', chapters: 5 },
    ];

    expect(parseTypedVerseReference('요한복음3', canon)).toMatchObject({
      bookId: 'JHN',
      chapter: 3,
      complete: false,
    });
    expect(parseTypedVerseReference('요한복음3:16-', canon)).toMatchObject({
      bookId: 'JHN',
      chapter: 3,
      startVerse: 16,
      complete: false,
    });
    expect(parseTypedVerseReference('요한복음3:16-17', canon)).toEqual({
      bookId: 'JHN',
      chapter: 3,
      startVerse: 16,
      endVerse: 17,
      complete: true,
    });
    expect(parseTypedVerseReference('요한복음22:16', canon).complete).toBe(false);
    expect(parseTypedVerseReference('요한복음3:18-17', canon).complete).toBe(false);
  });

  it('moves a legacy note-level reference into the editor document', () => {
    const note = {
      title: '묵상',
      reference: { bookId: 'JHN', chapter: 3, startVerse: 16, endVerse: 17 },
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '기록' }] }],
      },
    };

    const migrated = migrateLegacyVerseReference(note);
    expect(migrated.reference).toBeUndefined();
    expect(migrated.content.content[0].content.at(-1)).toEqual({
      type: 'verseMention',
      attrs: note.reference,
    });
    expect(getVerseMentions(migrated.content)).toEqual([note.reference]);
    expect(getVerseMentions(migrateLegacyVerseReference(migrated).content)).toEqual([
      note.reference,
    ]);
  });
});
