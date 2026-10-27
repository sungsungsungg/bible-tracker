import React from 'react';
import { Search } from 'lucide-react';
import books from '../../data/books.json';

export default function BookListPanel({
  books: visibleBooks,
  readChapters,
  selectedBookId,
  searchTerm,
  onSearchChange,
  testamentFilter,
  onTestamentChange,
  onSelectBook,
}) {
  return (
    <aside className="book-panel" aria-label="성경 책 목록">
      <div className="panel-heading">
        <div>
          <p className="section-overline">66권의 책</p>
          <h2>성경 목차</h2>
        </div>
        <span className="book-total">66권</span>
      </div>
      <label className="search-box">
        <Search size={17} aria-hidden="true" />
        <input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="책 이름 검색"
          aria-label="책 이름 검색"
        />
        {searchTerm && (
          <button
            className="clear-search"
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="검색어 지우기"
          >
            ×
          </button>
        )}
      </label>
      <div className="testament-tabs" role="group" aria-label="성경 구분">
        {['전체', '구약', '신약'].map((testament) => (
          <button
            key={testament}
            type="button"
            className={testamentFilter === testament ? 'active' : ''}
            onClick={() => onTestamentChange(testament)}
          >
            {testament}
          </button>
        ))}
      </div>
      <nav className="book-list" aria-label="책 선택">
        {visibleBooks.map((book) => {
          const readCount = (readChapters[book.id] ?? []).length;
          const isSelected = selectedBookId === book.id;
          return (
            <button
              key={book.id}
              type="button"
              className={`book-row ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectBook(book.id)}
            >
              <span className="book-index">
                {String(books.findIndex((item) => item.id === book.id) + 1).padStart(2, '0')}
              </span>
              <span className="book-name">{book.name}</span>
              <span className="book-progress">
                {readCount > 0 ? `${readCount}/${book.chapters}` : `${book.chapters}장`}
              </span>
              {isSelected && <span className="selected-dot" aria-hidden="true" />}
            </button>
          );
        })}
        {visibleBooks.length === 0 && <p className="empty-search">검색 결과가 없습니다.</p>}
      </nav>
    </aside>
  );
}
