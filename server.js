import { randomUUID } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createServer as createViteServer } from 'vite';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const books = JSON.parse(await readFile(path.join(rootDirectory, 'data/books.json'), 'utf8'));
const booksById = new Map(books.map((book) => [book.id, book]));
const progressPath = path.join(rootDirectory, 'data/progress.json');
const notesPath = path.join(rootDirectory, 'data/notes.json');
const app = express();

app.use(express.json({ limit: '2mb' }));

async function writeJsonAtomically(filePath, data) {
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

function isValidTimestamp(value) {
  return (
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value)) &&
    isValidDate(value.slice(0, 10))
  );
}

function hasValidVerseMentions(node) {
  if (!node || typeof node !== 'object') return true;
  if (node.type === 'verseMention') {
    const attributes = node.attrs;
    const book = booksById.get(attributes?.bookId);
    if (
      !book ||
      !Number.isInteger(attributes.chapter) ||
      attributes.chapter < 1 ||
      attributes.chapter > book.chapters ||
      !Number.isInteger(attributes.startVerse) ||
      attributes.startVerse < 1 ||
      attributes.startVerse > 200 ||
      (attributes.endVerse != null &&
        (!Number.isInteger(attributes.endVerse) ||
          attributes.endVerse < attributes.startVerse ||
          attributes.endVerse > 200))
    )
      return false;
  }
  return (node.content ?? []).every(hasValidVerseMentions);
}

app.get('/api/notes', async (_request, response, next) => {
  try {
    response.json(JSON.parse(await readFile(notesPath, 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') return response.json({ notes: [] });
    return next(error);
  }
});

app.put('/api/notes', async (request, response, next) => {
  const { notes } = request.body ?? {};
  if (!Array.isArray(notes) || notes.length > 500) {
    return response.status(400).json({ error: '노트 목록 형식이 올바르지 않습니다.' });
  }

  const noteIds = new Set();
  for (const note of notes) {
    const reference = note?.reference;
    const referenceBook = reference ? booksById.get(reference.bookId) : null;
    if (
      !note ||
      typeof note.id !== 'string' ||
      note.id.length < 1 ||
      note.id.length > 80 ||
      noteIds.has(note.id) ||
      typeof note.title !== 'string' ||
      note.title.length > 200 ||
      !isValidDate(note.date) ||
      !note.content ||
      typeof note.content !== 'object' ||
      Array.isArray(note.content) ||
      !note.content.type ||
      !hasValidVerseMentions(note.content) ||
      !isValidTimestamp(note.createdAt) ||
      !isValidTimestamp(note.updatedAt) ||
      (reference &&
        (!referenceBook ||
          !Number.isInteger(reference.chapter) ||
          reference.chapter < 1 ||
          reference.chapter > referenceBook.chapters ||
          !Number.isInteger(reference.startVerse) ||
          reference.startVerse < 1 ||
          reference.startVerse > 200 ||
          (reference.endVerse != null &&
            (!Number.isInteger(reference.endVerse) ||
              reference.endVerse < reference.startVerse ||
              reference.endVerse > 200))))
    ) {
      return response
        .status(400)
        .json({ error: '노트 내용이나 성경 구절 참조가 올바르지 않습니다.' });
    }
    noteIds.add(note.id);
  }

  try {
    const savedNotes = notes.map((note) => ({
      id: note.id,
      title: note.title.slice(0, 200),
      date: note.date,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      content: note.content,
    }));
    await writeJsonAtomically(notesPath, { schemaVersion: 1, notes: savedNotes });
    return response.json({ notes: savedNotes });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/progress', async (_request, response, next) => {
  try {
    response.json(JSON.parse(await readFile(progressPath, 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return response.json({
        schemaVersion: 1,
        currentPosition: { bookId: 'GEN', chapter: 1 },
        readChapters: {},
        dailyHistory: {},
      });
    }
    next(error);
  }
});

app.put('/api/progress', async (request, response, next) => {
  const { currentPosition, readChapters, dailyHistory = {} } = request.body ?? {};
  const currentBook = booksById.get(currentPosition?.bookId);
  const chapter = Number(currentPosition?.chapter);

  if (
    !currentBook ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    chapter > currentBook.chapters ||
    !readChapters ||
    typeof readChapters !== 'object' ||
    Array.isArray(readChapters) ||
    !dailyHistory ||
    typeof dailyHistory !== 'object' ||
    Array.isArray(dailyHistory) ||
    Object.keys(dailyHistory).length > 4000
  ) {
    return response.status(400).json({ error: '읽기 진행 데이터가 올바르지 않습니다.' });
  }

  const normalizedReads = {};
  for (const [bookId, chapters] of Object.entries(readChapters)) {
    const book = booksById.get(bookId);
    if (
      !book ||
      !Array.isArray(chapters) ||
      chapters.some((value) => !Number.isInteger(value) || value < 1 || value > book.chapters)
    ) {
      return response.status(400).json({ error: '읽은 장 데이터가 올바르지 않습니다.' });
    }
    normalizedReads[bookId] = [...new Set(chapters)].sort((first, second) => first - second);
  }

  const normalizedHistory = {};
  for (const [date, booksRead] of Object.entries(dailyHistory)) {
    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date ||
      !booksRead ||
      typeof booksRead !== 'object' ||
      Array.isArray(booksRead)
    ) {
      return response.status(400).json({ error: '날짜별 읽기 기록이 올바르지 않습니다.' });
    }

    normalizedHistory[date] = {};
    for (const [bookId, chapters] of Object.entries(booksRead)) {
      const book = booksById.get(bookId);
      if (
        !book ||
        !Array.isArray(chapters) ||
        chapters.length === 0 ||
        chapters.some((value) => !Number.isInteger(value) || value < 1 || value > book.chapters)
      ) {
        return response.status(400).json({ error: '날짜별 읽기 기록이 올바르지 않습니다.' });
      }
      normalizedHistory[date][bookId] = [...new Set(chapters)].sort(
        (first, second) => first - second,
      );
    }
  }

  const progress = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    currentPosition: { bookId: currentBook.id, chapter },
    readChapters: normalizedReads,
    dailyHistory: normalizedHistory,
  };
  try {
    await writeJsonAtomically(progressPath, progress);
    response.json(progress);
  } catch (error) {
    next(error);
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(rootDirectory, 'dist')));
  app.use((request, response, next) => {
    if (request.method === 'GET' && !request.path.startsWith('/api/')) {
      return response.sendFile(path.join(rootDirectory, 'dist/index.html'));
    }
    return next();
  });
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: '서버에서 요청을 처리하지 못했습니다.' });
});

const port = Number(process.env.PORT ?? 5173);
app.listen(port, '127.0.0.1', () => {
  console.log(`말씀길 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
