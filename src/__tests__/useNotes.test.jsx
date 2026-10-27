/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotes } from '../hooks/useNotes.js';

function response(payload, ok = true) {
  return { ok, json: async () => payload };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useNotes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ notes: [] })));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('creates, updates, and deletes notes with debounced JSON persistence', async () => {
    const { result } = renderHook(() => useNotes());
    await flushEffects();
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.selectedNote).toBeNull();

    act(() => result.current.createNewNote());
    const createdId = result.current.selectedNoteId;
    expect(result.current.selectedNote).toMatchObject({
      title: '',
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    });

    act(() =>
      result.current.updateNote(createdId, {
        title: '믿음의 기록',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: '요한복음 말씀 ' },
                {
                  type: 'verseMention',
                  attrs: { bookId: 'JHN', chapter: 3, startVerse: 16, endVerse: 17 },
                },
              ],
            },
          ],
        },
      }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(351);
    });

    const saveCall = fetch.mock.calls.filter(([, options]) => options?.method === 'PUT').at(-1);
    const savedNotes = JSON.parse(saveCall[1].body).notes;
    expect(savedNotes[0]).toMatchObject({
      id: createdId,
      title: '믿음의 기록',
      content: expect.objectContaining({
        content: expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'verseMention',
                attrs: { bookId: 'JHN', chapter: 3, startVerse: 16, endVerse: 17 },
              }),
            ]),
          }),
        ]),
      }),
    });

    act(() => result.current.deleteNote(createdId));
    expect(result.current.notes).toEqual([]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(351);
    });
    const deleteCall = fetch.mock.calls.filter(([, options]) => options?.method === 'PUT').at(-1);
    expect(JSON.parse(deleteCall[1].body)).toEqual({ notes: [] });
  });

  it('saves the latest note immediately when requested manually', async () => {
    const { result } = renderHook(() => useNotes());
    await flushEffects();

    let note;
    act(() => {
      note = result.current.createNewNote();
      result.current.updateNote(note.id, { title: '바로 저장' });
    });

    expect(result.current.saveStatus).toBe('unsaved');
    let saved;
    await act(async () => {
      saved = await result.current.saveNotes();
    });

    expect(saved).toBe(true);
    expect(result.current.saveStatus).toBe('saved');
    const putCalls = fetch.mock.calls.filter(([, options]) => options?.method === 'PUT');
    expect(putCalls).toHaveLength(1);
    expect(JSON.parse(putCalls[0][1].body).notes[0].title).toBe('바로 저장');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(351);
    });
    expect(fetch.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(1);
  });
});
