import { useEffect, useRef, useState } from 'react';
import { getLocalDateKey } from '../utils/readingProgress.js';
import { migrateLegacyVerseReference } from '../utils/verseMentions.js';

const emptyDocument = { type: 'doc', content: [{ type: 'paragraph' }] };

function createNote() {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: '',
    date: getLocalDateKey(),
    createdAt: now,
    updatedAt: now,
    content: emptyDocument,
  };
}

export function useNotes() {
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('loading');
  const saveRequestRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const notesRevisionRef = useRef(0);

  async function saveNotes() {
    window.clearTimeout(saveTimeoutRef.current);
    saveRequestRef.current?.abort();
    const controller = new AbortController();
    saveRequestRef.current = controller;
    const savedRevision = notesRevisionRef.current;
    setSaveStatus('saving');

    try {
      const response = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('노트를 저장하지 못했습니다.');
      setSaveStatus(notesRevisionRef.current === savedRevision ? 'saved' : 'unsaved');
      return true;
    } catch {
      if (!controller.signal.aborted) setSaveStatus('error');
      return false;
    } finally {
      if (saveRequestRef.current === controller) saveRequestRef.current = null;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      try {
        const response = await fetch('/api/notes');
        if (!response.ok) throw new Error('노트를 불러오지 못했습니다.');
        const data = await response.json();
        if (cancelled) return;
        const loadedNotes = (data.notes ?? []).map(migrateLegacyVerseReference);
        setNotes(loadedNotes);
        setSelectedNoteId(loadedNotes[0]?.id ?? null);
        setSaveStatus('saved');
      } catch {
        if (!cancelled) setSaveStatus('error');
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }

    loadNotes();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;
    saveTimeoutRef.current = window.setTimeout(() => {
      saveNotes();
    }, 350);

    return () => {
      window.clearTimeout(saveTimeoutRef.current);
    };
  }, [notes, isLoaded]);

  function createNewNote() {
    const note = createNote();
    setNotes((currentNotes) => [note, ...currentNotes]);
    setSelectedNoteId(note.id);
    notesRevisionRef.current += 1;
    setSaveStatus('unsaved');
    return note;
  }

  function updateNote(noteId, updates) {
    notesRevisionRef.current += 1;
    setSaveStatus('unsaved');
    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === noteId ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note,
      ),
    );
  }

  function deleteNote(noteId) {
    const remainingNotes = notes.filter((note) => note.id !== noteId);
    setNotes(remainingNotes);
    notesRevisionRef.current += 1;
    setSaveStatus('unsaved');
    if (selectedNoteId === noteId) setSelectedNoteId(remainingNotes[0]?.id ?? null);
  }

  return {
    notes,
    selectedNoteId,
    selectedNote: notes.find((note) => note.id === selectedNoteId) ?? null,
    isLoaded,
    saveStatus,
    saveNotes,
    setSelectedNoteId,
    createNewNote,
    updateNote,
    deleteNote,
  };
}
