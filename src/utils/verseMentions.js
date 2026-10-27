export function parseTypedVerseReference(query, books) {
  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
  const matchingBooks = [...books]
    .sort((first, second) => second.name.length - first.name.length)
    .filter((book) => normalizedQuery.startsWith(book.name.toLocaleLowerCase('ko-KR')));
  const book = matchingBooks[0];

  if (!book) return null;

  const suffix = normalizedQuery.slice(book.name.length);
  if (!suffix)
    return { bookId: book.id, chapter: null, startVerse: null, endVerse: null, complete: false };

  const match = suffix.match(/^(\d+)?(?::(\d+)?(?:-(\d+)?)?)?$/);
  if (!match) return null;

  const chapter = match[1] ? Number(match[1]) : null;
  const startVerse = match[2] ? Number(match[2]) : null;
  const endVerse = match[3] ? Number(match[3]) : null;
  const hasRangeDelimiter = suffix.includes('-');
  const complete =
    chapter != null &&
    startVerse != null &&
    (!hasRangeDelimiter || endVerse != null) &&
    chapter >= 1 &&
    chapter <= book.chapters &&
    startVerse >= 1 &&
    startVerse <= 200 &&
    (endVerse == null || (endVerse >= startVerse && endVerse <= 200));

  return {
    bookId: book.id,
    chapter,
    startVerse,
    endVerse,
    complete,
  };
}

export function getVerseMentions(document) {
  const mentions = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'verseMention' && node.attrs) mentions.push(node.attrs);
    for (const child of node.content ?? []) visit(child);
  };
  visit(document);
  return mentions;
}

export function migrateLegacyVerseReference(note) {
  if (!note.reference || getVerseMentions(note.content).length > 0) {
    const { reference: _legacyReference, ...currentNote } = note;
    return currentNote;
  }

  const content =
    note.content?.type === 'doc'
      ? structuredClone(note.content)
      : { type: 'doc', content: [{ type: 'paragraph' }] };
  const mention = { type: 'verseMention', attrs: note.reference };
  const lastNode = content.content?.at(-1);
  if (lastNode?.type === 'paragraph') lastNode.content = [...(lastNode.content ?? []), mention];
  else content.content = [...(content.content ?? []), { type: 'paragraph', content: [mention] }];

  const { reference: _legacyReference, ...currentNote } = note;
  return { ...currentNote, content };
}
