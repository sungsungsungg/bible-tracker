import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Extension, Node } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { useEditor, EditorContent } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { FontSize, TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import {
  AlignLeft,
  Bold,
  BookOpen,
  Check,
  ChevronDown,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Plus,
  Quote,
  Search,
  Save,
  Strikethrough,
  Trash2,
  Underline as UnderlineIcon,
} from 'lucide-react';
import books from '../../data/books.json';
import { useNotes } from '../hooks/useNotes.js';
import {
  getVerseMentions,
  migrateLegacyVerseReference,
  parseTypedVerseReference,
} from '../utils/verseMentions.js';

const editorExtensions = [
  StarterKit,
  TextStyle,
  FontFamily,
  FontSize,
  Color,
  Highlight.configure({ multicolor: true }),
];

function formatVerseMention(reference) {
  const book = books.find((item) => item.id === reference.bookId);
  const verseRange =
    reference.endVerse && reference.endVerse !== reference.startVerse
      ? `${reference.startVerse}-${reference.endVerse}`
      : String(reference.startVerse);
  return `@${book?.name ?? reference.bookId}${reference.chapter}:${verseRange}`;
}

const VerseMention = Node.create({
  name: 'verseMention',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      bookId: { default: 'GEN' },
      chapter: { default: 1 },
      startVerse: { default: 1 },
      endVerse: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-verse-mention]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      { ...HTMLAttributes, 'data-verse-mention': '', class: 'verse-mention' },
      formatVerseMention(node.attrs),
    ];
  },
});

function createVerseSuggestion(onChange) {
  let activeSuggestion = null;

  function commitTypedReference(breakAfter) {
    const parsed = parseTypedVerseReference(activeSuggestion?.query ?? '', books);
    if (!activeSuggestion || !parsed?.complete) return false;
    activeSuggestion.command({ ...parsed, breakAfter });
    return true;
  }

  return Extension.create({
    name: 'verseMentionSuggestion',
    priority: 1000,
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            handleTextInput: (_view, _from, _to, text) => {
              if (text !== ' ') return false;
              const parsed = parseTypedVerseReference(activeSuggestion?.query ?? '', books);
              if (!activeSuggestion || !parsed?.complete) return false;
              activeSuggestion.command({ ...parsed, breakAfter: 'space' });
              return true;
            },
            handleKeyDown: (_view, event) => {
              if (event.key !== 'Enter') return false;
              if (!commitTypedReference('line')) return false;
              event.preventDefault();
              return true;
            },
          },
        }),
        Suggestion({
          editor: this.editor,
          char: '@',
          command: ({ editor, range, props }) => {
            const chain = editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent({
                type: 'verseMention',
                attrs: {
                  bookId: props.bookId,
                  chapter: props.chapter,
                  startVerse: props.startVerse,
                  endVerse: props.endVerse,
                },
              });
            if (props.breakAfter === 'line') chain.splitBlock();
            else chain.insertContent({ type: 'text', text: ' ' });
            chain.run();
          },
          render: () => ({
            onStart: (props) => {
              activeSuggestion = props;
              onChange(props);
            },
            onUpdate: (props) => {
              activeSuggestion = props;
              onChange(props);
            },
            onExit: () => {
              activeSuggestion = null;
              onChange(null);
            },
            onKeyDown: ({ event }) => {
              if (event.key !== 'Enter') return false;
              if (!commitTypedReference('line')) return false;
              event.preventDefault();
              return true;
            },
          }),
        }),
      ];
    },
  });
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(`${dateString}T00:00:00`));
}

function SaveIndicator({ status }) {
  const labels = {
    loading: '노트 불러오는 중',
    unsaved: '저장되지 않은 변경 사항',
    saving: '저장 중',
    saved: '모든 변경 사항 저장됨',
    error: '저장 오류',
  };
  return (
    <span className={`notes-save-status ${status}`}>
      <span />
      {labels[status]}
    </span>
  );
}

function NoteToolbar({ editor }) {
  if (!editor) return null;

  function toggleMark(mark) {
    editor.chain().focus()[mark]().run();
  }

  return (
    <div
      className="note-toolbar"
      role="toolbar"
      aria-label="본문 서식"
      onMouseDown={(event) => {
        if (event.target.closest('button')) event.preventDefault();
      }}
    >
      <label className="note-format-select font-family-select">
        <span className="sr-only">글꼴</span>
        <select
          aria-label="글꼴"
          defaultValue="Gowun Dodum"
          onChange={(event) => editor.chain().focus().setFontFamily(event.target.value).run()}
        >
          <option value="Gowun Dodum">고운돋움</option>
          <option value="Gowun Batang">고운바탕</option>
          <option value="serif">명조체</option>
          <option value="sans-serif">고딕체</option>
          <option value="monospace">고정폭</option>
        </select>
        <ChevronDown size={13} />
      </label>
      <label className="note-format-select font-size-select">
        <span className="sr-only">글자 크기</span>
        <select
          aria-label="글자 크기"
          defaultValue="16px"
          onChange={(event) => editor.chain().focus().setFontSize(event.target.value).run()}
        >
          <option value="13px">작게</option>
          <option value="16px">보통</option>
          <option value="20px">크게</option>
          <option value="28px">제목</option>
          <option value="36px">큰 제목</option>
        </select>
        <ChevronDown size={13} />
      </label>
      <span className="toolbar-divider" />
      <button
        type="button"
        className={editor.isActive('bold') ? 'active' : ''}
        title="굵게"
        aria-label="굵게"
        onClick={() => toggleMark('toggleBold')}
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        className={editor.isActive('italic') ? 'active' : ''}
        title="기울임"
        aria-label="기울임"
        onClick={() => toggleMark('toggleItalic')}
      >
        <Italic size={16} />
      </button>
      <button
        type="button"
        className={editor.isActive('underline') ? 'active' : ''}
        title="밑줄"
        aria-label="밑줄"
        onClick={() => toggleMark('toggleUnderline')}
      >
        <UnderlineIcon size={16} />
      </button>
      <button
        type="button"
        className={editor.isActive('strike') ? 'active' : ''}
        title="취소선"
        aria-label="취소선"
        onClick={() => toggleMark('toggleStrike')}
      >
        <Strikethrough size={16} />
      </button>
      <span className="toolbar-divider" />
      <button
        type="button"
        title="강조 표시"
        aria-label="노란색 강조 표시"
        onClick={() => editor.chain().focus().toggleHighlight({ color: '#f5e89b' }).run()}
      >
        <Highlighter size={16} />
      </button>
      <label className="note-color-control" title="글자 색상">
        <span className="sr-only">글자 색상</span>
        <input
          aria-label="글자 색상"
          type="color"
          defaultValue="#183c34"
          onInput={(event) => editor.chain().focus().setColor(event.target.value).run()}
        />
        <span>A</span>
      </label>
      <span className="toolbar-divider" />
      <button
        type="button"
        className={editor.isActive('heading', { level: 1 }) ? 'active' : ''}
        title="큰 제목"
        aria-label="큰 제목"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={17} />
      </button>
      <button
        type="button"
        className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
        title="소제목"
        aria-label="소제목"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={17} />
      </button>
      <button
        type="button"
        className={editor.isActive('bulletList') ? 'active' : ''}
        title="글머리 기호"
        aria-label="글머리 기호 목록"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={17} />
      </button>
      <button
        type="button"
        className={editor.isActive('orderedList') ? 'active' : ''}
        title="번호 목록"
        aria-label="번호 목록"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={17} />
      </button>
      <button
        type="button"
        className={editor.isActive('blockquote') ? 'active' : ''}
        title="인용"
        aria-label="인용"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={16} />
      </button>
    </div>
  );
}

function VerseMentionPicker({ suggestion }) {
  const query = suggestion.query.trim().toLocaleLowerCase('ko-KR');
  const typedReference = parseTypedVerseReference(suggestion.query, books);
  const matchingBooks = typedReference
    ? books.filter((book) => book.id === typedReference.bookId)
    : books.filter((book) => !query || book.name.toLocaleLowerCase('ko-KR').includes(query));
  const [bookId, setBookId] = useState(
    typedReference?.bookId ?? matchingBooks[0]?.id ?? books[0].id,
  );
  const [chapter, setChapter] = useState(1);
  const [startVerse, setStartVerse] = useState(1);
  const [endVerse, setEndVerse] = useState('');
  const selectedBook = books.find((book) => book.id === bookId) ?? books[0];
  const rect = suggestion.clientRect?.();

  useEffect(() => {
    if (typedReference) {
      setBookId(typedReference.bookId);
      if (typedReference.chapter != null) setChapter(typedReference.chapter);
      if (typedReference.startVerse != null) setStartVerse(typedReference.startVerse);
      if (typedReference.endVerse != null) setEndVerse(String(typedReference.endVerse));
      else if (!suggestion.query.includes('-')) setEndVerse('');
      return;
    }
    if (matchingBooks.length && !matchingBooks.some((book) => book.id === bookId)) {
      setBookId(matchingBooks[0].id);
      setChapter(1);
    }
  }, [suggestion.query]);

  function insertMention(event) {
    event.preventDefault();
    suggestion.command({
      bookId,
      chapter,
      startVerse,
      endVerse: endVerse ? Math.max(startVerse, Number(endVerse)) : null,
    });
  }

  if (!rect) return null;
  const popupWidth = Math.min(390, window.innerWidth - 24);
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - popupWidth - 12));
  const top = rect.bottom + 8;
  const maxHeight = Math.max(120, window.innerHeight - top - 12);

  return createPortal(
    <div
      className="verse-mention-picker"
      role="dialog"
      aria-label="성경 구절 태그 선택"
      style={{ left, top, maxHeight }}
    >
      <div className="mention-picker-heading">
        <BookOpen size={15} />
        <strong>구절 태그</strong>
        <span>@ 입력</span>
      </div>
      <div className="mention-picker-fields">
        <label>
          <span>책</span>
          <select
            aria-label="멘션 책"
            value={bookId}
            onChange={(event) => {
              setBookId(event.target.value);
              setChapter(1);
            }}
          >
            {matchingBooks.map((book) => (
              <option value={book.id} key={book.id}>
                {book.name}
              </option>
            ))}
            {!matchingBooks.length && <option value={bookId}>{selectedBook.name}</option>}
          </select>
        </label>
        <label>
          <span>장</span>
          <select
            aria-label="멘션 장"
            value={chapter}
            onChange={(event) => setChapter(Number(event.target.value))}
          >
            {Array.from({ length: selectedBook.chapters }, (_, index) => index + 1).map((value) => (
              <option value={value} key={value}>
                {value}장
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>절</span>
          <input
            aria-label="멘션 시작 절"
            type="number"
            min="1"
            max="200"
            value={startVerse}
            onChange={(event) => setStartVerse(Math.max(1, Number(event.target.value) || 1))}
          />
        </label>
        <span className="mention-range-separator">~</span>
        <label>
          <span>끝 절</span>
          <input
            aria-label="멘션 끝 절"
            type="number"
            min={startVerse}
            max="200"
            placeholder="선택"
            value={endVerse}
            onChange={(event) => setEndVerse(event.target.value)}
          />
        </label>
      </div>
      <div className="mention-picker-footer">
        <span>
          {formatVerseMention({
            bookId,
            chapter,
            startVerse,
            endVerse: endVerse ? Math.max(startVerse, Number(endVerse)) : null,
          })}
        </span>
        <button type="button" onClick={insertMention}>
          <Check size={14} /> 본문에 삽입
        </button>
      </div>
    </div>,
    document.body,
  );
}

function NoteEditor({ note, onUpdate }) {
  const [suggestion, setSuggestion] = useState(null);
  const suggestionRef = useRef(null);
  const extensions = useMemo(
    () => [
      ...editorExtensions,
      VerseMention,
      createVerseSuggestion((props) => {
        suggestionRef.current = props;
        setSuggestion(props);
      }),
    ],
    [],
  );
  const editor = useEditor({
    extensions,
    content: note.content,
    editorProps: {
      attributes: { class: 'note-editor-content', 'aria-label': '노트 본문' },
      handleTextInput: (_view, _from, _to, text) => {
        if (text !== ' ') return false;
        const activeSuggestion = suggestionRef.current;
        const parsed = parseTypedVerseReference(activeSuggestion?.query ?? '', books);
        if (!activeSuggestion || !parsed?.complete) return false;
        activeSuggestion.command({ ...parsed, breakAfter: 'space' });
        return true;
      },
      handleKeyDown: (_view, event) => {
        if (event.key !== 'Enter') return false;
        const activeSuggestion = suggestionRef.current;
        const parsed = parseTypedVerseReference(activeSuggestion?.query ?? '', books);
        if (!activeSuggestion || !parsed?.complete) return false;
        event.preventDefault();
        activeSuggestion.command({ ...parsed, breakAfter: 'line' });
        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => onUpdate({ content: currentEditor.getJSON() }),
  });

  return (
    <>
      <div className="notes-editor-meta">
        <label className="note-date-input">
          <span>기록 날짜</span>
          <input
            type="date"
            value={note.date}
            onChange={(event) => onUpdate({ date: event.target.value })}
          />
        </label>
        <span className="note-created-date">
          처음 작성 {formatDate(note.createdAt.slice(0, 10))}
        </span>
      </div>
      <input
        className="note-title-input"
        value={note.title}
        onChange={(event) => onUpdate({ title: event.target.value })}
        placeholder="제목 없는 노트"
        aria-label="노트 제목"
        maxLength={200}
      />
      <NoteToolbar editor={editor} />
      <div className="note-editor-canvas">
        <EditorContent editor={editor} />
      </div>
      {suggestion && <VerseMentionPicker key={suggestion.range.from} suggestion={suggestion} />}
    </>
  );
}

export default function NotesPage() {
  const {
    notes,
    selectedNoteId,
    selectedNote,
    isLoaded,
    saveStatus,
    saveNotes,
    setSelectedNoteId,
    createNewNote,
    updateNote,
    deleteNote,
  } = useNotes();
  const [search, setSearch] = useState('');
  const visibleNotes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ko-KR');
    return notes.filter((note) => !query || note.title.toLocaleLowerCase('ko-KR').includes(query));
  }, [notes, search]);

  return (
    <section className="notes-workspace" aria-label="말씀 노트">
      <aside className="notes-sidebar">
        <div className="notes-sidebar-heading">
          <div>
            <p className="section-overline">나의 묵상과 기록</p>
            <h2>노트 보관함</h2>
          </div>
          <button
            type="button"
            className="new-note-button"
            onClick={createNewNote}
            aria-label="새 노트"
            title="새 노트"
          >
            <Plus size={17} />
          </button>
        </div>
        <label className="notes-search">
          <Search size={15} />
          <input
            aria-label="노트 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="노트 검색"
          />
        </label>
        <div className="notes-list" aria-label="저장한 노트">
          {visibleNotes.map((note) => (
            <button
              type="button"
              className={`note-list-item ${selectedNoteId === note.id ? 'selected' : ''}`}
              key={note.id}
              onClick={() => setSelectedNoteId(note.id)}
            >
              <span className="note-list-title">{note.title || '제목 없는 노트'}</span>
              <span className="note-list-date">{formatDate(note.date)}</span>
              {getVerseMentions(note.content).length > 0 && (
                <span className="note-list-reference">
                  {formatVerseMention(getVerseMentions(note.content)[0])}
                </span>
              )}
            </button>
          ))}
          {isLoaded && visibleNotes.length === 0 && (
            <p className="notes-list-empty">
              {search ? '검색 결과가 없습니다.' : '아직 노트가 없습니다.'}
            </p>
          )}
        </div>
        <div className="notes-sidebar-footer">
          <SaveIndicator status={saveStatus} />
        </div>
      </aside>

      <div className="notes-editor-panel">
        {selectedNote ? (
          <>
            <div className="notes-editor-topline">
              <span>말씀 노트</span>
              <div className="note-actions">
                <SaveIndicator status={saveStatus} />
                <button
                  type="button"
                  className="save-note-button"
                  onClick={saveNotes}
                  disabled={!isLoaded || saveStatus === 'saving' || saveStatus === 'saved'}
                >
                  <Save size={15} /> 저장
                </button>
                <button
                  type="button"
                  className="delete-note-button"
                  onClick={() => deleteNote(selectedNote.id)}
                  aria-label="현재 노트 삭제"
                  title="노트 삭제"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <NoteEditor
              key={selectedNote.id}
              note={selectedNote}
              onUpdate={(updates) => updateNote(selectedNote.id, updates)}
            />
            <div className="notes-editor-footer">
              <SaveIndicator status={saveStatus} />
              <span>이 노트는 이 기기에 저장됩니다</span>
            </div>
          </>
        ) : (
          <div className="notes-empty-state">
            <span className="notes-empty-icon">
              <AlignLeft size={22} />
            </span>
            <h2>{isLoaded ? '생각을 기록해 보세요' : '노트를 불러오는 중'}</h2>
            <p>
              {isLoaded
                ? '말씀에서 발견한 것과 떠오른 생각을 한곳에 모아두세요.'
                : '잠시만 기다려 주세요.'}
            </p>
            {isLoaded && (
              <button type="button" className="new-note-primary" onClick={createNewNote}>
                <Plus size={16} /> 첫 노트 쓰기
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
