import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import books from '../../data/books.json';
import {
  buildMonthCalendar,
  getDailyChapterCount,
  getLocalDateKey,
  shiftMonthKey,
} from '../utils/readingProgress.js';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

export default function MonthlyReadingCalendar({ dailyHistory }) {
  const todayKey = getLocalDateKey();
  const [monthKey, setMonthKey] = useState(todayKey.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const calendarDays = useMemo(
    () => buildMonthCalendar(monthKey, dailyHistory),
    [monthKey, dailyHistory],
  );
  const monthChapterCount = calendarDays.reduce(
    (total, day) => total + (day.isCurrentMonth ? day.chapterCount : 0),
    0,
  );
  const activeDays = calendarDays.filter(
    (day) => day.isCurrentMonth && day.chapterCount > 0,
  ).length;
  const selectedBooks = dailyHistory[selectedDate] ?? {};
  const selectedChapterCount = getDailyChapterCount(dailyHistory, selectedDate);
  const selectedDateLabel = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(`${selectedDate}T00:00:00`));

  function changeMonth(direction) {
    const nextMonth = shiftMonthKey(monthKey, direction);
    setMonthKey(nextMonth);
    setSelectedDate(`${nextMonth}-01`);
  }

  function selectDate(day) {
    setSelectedDate(day.dateKey);
    if (!day.isCurrentMonth) setMonthKey(day.dateKey.slice(0, 7));
  }

  return (
    <section className="monthly-calendar" aria-labelledby="calendar-title">
      <div className="calendar-heading">
        <div>
          <p className="section-overline">날짜별 읽기 기록</p>
          <h2 id="calendar-title">
            <CalendarDays size={19} /> 읽기 달력
          </h2>
        </div>
        <div className="calendar-month-nav">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="이전 달">
            <ChevronLeft size={17} />
          </button>
          <strong>
            {new Intl.DateTimeFormat('ko-KR', {
              year: 'numeric',
              month: 'long',
              timeZone: 'UTC',
            }).format(new Date(`${monthKey}-01T00:00:00.000Z`))}
          </strong>
          <button type="button" onClick={() => changeMonth(1)} aria-label="다음 달">
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="calendar-layout">
        <div className="calendar-grid" role="grid" aria-label={`${monthKey} 읽기 달력`}>
          {weekdays.map((weekday, index) => (
            <span
              className={`calendar-weekday ${index === 0 ? 'sunday' : ''}`}
              role="columnheader"
              key={weekday}
            >
              {weekday}
            </span>
          ))}
          {calendarDays.map((day) => {
            const isSelected = selectedDate === day.dateKey;
            const isToday = todayKey === day.dateKey;
            return (
              <button
                className={`calendar-day ${day.isCurrentMonth ? '' : 'outside'} ${day.chapterCount ? 'has-reading' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                aria-label={`${day.dateKey}, ${day.chapterCount}장 읽음`}
                aria-pressed={isSelected}
                key={day.dateKey}
                onClick={() => selectDate(day)}
              >
                <span className="calendar-day-number">{day.day}</span>
                {day.chapterCount > 0 && (
                  <span className="calendar-day-count">{day.chapterCount}장</span>
                )}
                {day.chapterCount > 0 && (
                  <span className="calendar-activity-mark" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        <aside className="calendar-detail" aria-live="polite">
          <div className="calendar-month-summary">
            <div>
              <strong>{activeDays}</strong>
              <span>읽은 날</span>
            </div>
            <div>
              <strong>{monthChapterCount}</strong>
              <span>읽은 장</span>
            </div>
          </div>
          <div className="calendar-selected-heading">
            <span>{selectedDateLabel}</span>
            <strong>{selectedChapterCount}장</strong>
          </div>
          {selectedChapterCount === 0 ? (
            <p className="calendar-empty">이 날의 읽기 기록이 없습니다.</p>
          ) : (
            <ul className="calendar-reading-list">
              {Object.entries(selectedBooks)
                .sort(
                  ([firstId], [secondId]) =>
                    books.findIndex((book) => book.id === firstId) -
                    books.findIndex((book) => book.id === secondId),
                )
                .map(([bookId, chapters]) => {
                  const book = books.find((item) => item.id === bookId);
                  return (
                    <li key={bookId}>
                      <span>{book?.name ?? bookId}</span>
                      <strong>{chapters.map((chapter) => `${chapter}장`).join(', ')}</strong>
                    </li>
                  );
                })}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}
