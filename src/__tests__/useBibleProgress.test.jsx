/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBibleProgress } from '../hooks/useBibleProgress.js';
import { getLocalDateKey } from '../utils/readingProgress.js';

const books = [
  { id: 'GEN', name: '창세기', chapters: 3 },
  { id: 'EXO', name: '출애굽기', chapters: 2 },
];

function response(payload, ok = true) {
  return { ok, json: async () => payload };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useBibleProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('hydrates progress and persists a read followed by undo', async () => {
    const storedProgress = {
      currentPosition: { bookId: 'EXO', chapter: 2 },
      readChapters: { GEN: [1] },
      dailyHistory: { '2026-10-25': { GEN: [1] } },
    };
    fetch.mockResolvedValue(response(storedProgress));

    const { result } = renderHook(() => useBibleProgress(books));
    await flushEffects();

    expect(result.current.isHydrated).toBe(true);
    expect(result.current.currentPosition).toEqual({ bookId: 'EXO', chapter: 2 });

    act(() => result.current.toggleReadChapter('GEN', 1));
    expect(result.current.readChapters.GEN).toEqual([]);
    expect(result.current.dailyHistory).toEqual({});

    act(() => result.current.toggleReadChapter('GEN', 1));
    expect(result.current.readChapters.GEN).toEqual([1]);
    expect(result.current.dailyHistory[getLocalDateKey()].GEN).toEqual([1]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(251);
    });

    const saveCall = fetch.mock.calls.filter(([, options]) => options?.method === 'PUT').at(-1);
    expect(JSON.parse(saveCall[1].body)).toMatchObject({
      currentPosition: { bookId: 'EXO', chapter: 2 },
      readChapters: { GEN: [1] },
      dailyHistory: { [getLocalDateKey()]: { GEN: [1] } },
    });
  });

  it('updates current location across book boundaries', async () => {
    fetch.mockResolvedValue(
      response({
        currentPosition: { bookId: 'GEN', chapter: 3 },
        readChapters: {},
        dailyHistory: {},
      }),
    );
    const { result } = renderHook(() => useBibleProgress(books));
    await flushEffects();

    act(() => result.current.moveCurrentPosition(1));
    expect(result.current.currentPosition).toEqual({ bookId: 'EXO', chapter: 1 });

    act(() => result.current.moveCurrentPosition(-1));
    expect(result.current.currentPosition).toEqual({ bookId: 'GEN', chapter: 3 });
  });
});
