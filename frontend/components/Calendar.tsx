"use client";

import { useEffect, useMemo, useState } from "react";

type CalendarProps = {
  value?: Date;
  onChange?: (date: Date) => void;
  daySummary?: Record<
    string,
    { present: number; absent: number; totalEmployees: number }
  >;
  onMonthChange?: (year: number, month: number) => void;
};

function getDaysInMonth(year: number, month: number) {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function Calendar({
  value,
  onChange,
  daySummary,
  onMonthChange,
}: CalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const [current, setCurrent] = useState<Date>(value ?? today);

  const { year, month, days, startOffset, isAtCurrentMonth } = useMemo(() => {
    const year = current.getFullYear();
    const month = current.getMonth();
    const days = getDaysInMonth(year, month);
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = (firstDay + 6) % 7;
    const isAtCurrentMonth =
      year === today.getFullYear() && month === today.getMonth();
    return { year, month, days, startOffset, isAtCurrentMonth };
  }, [current, today]);

  useEffect(() => {
    onMonthChange?.(year, month + 1);
  }, [year, month, onMonthChange]);

  const handlePrev = () => {
    setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const handleNext = () => {
    if (isAtCurrentMonth) return;
    setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const handleSelect = (day: Date) => {
    onChange?.(day);
  };

  const monthLabel = current.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const selectedISO = value ? value.toISOString().slice(0, 10) : null;

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button type="button" onClick={handlePrev} aria-label="Previous month">
          &#x2190;
        </button>
        <div className="calendar-month">{monthLabel}</div>
        {!isAtCurrentMonth && (
          <button type="button" onClick={handleNext} aria-label="Next month">
            &#x2192;
          </button>
        )}
      </div>
      <div className="calendar-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div key={label} className="calendar-day-label">
            {label}
          </div>
        ))}
        {Array.from({ length: startOffset }).map((_, idx) => (
          <div key={`empty-${idx}`} className="calendar-day empty" />
        ))}
        {days.map((day) => {
          const iso = day.toISOString().slice(0, 10);
          const isToday = day.getTime() === today.getTime();
          const isSelected = selectedISO === iso;
          const isFutureInCurrent =
            isAtCurrentMonth && day.getTime() > today.getTime();

          if (isFutureInCurrent) {
            return <div key={iso} className="calendar-day empty" />;
          }

          const summary = daySummary?.[iso];

          return (
            <button
              key={iso}
              type="button"
              className={[
                "calendar-day",
                isToday ? "calendar-day-today" : "",
                isSelected ? "calendar-day-selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleSelect(day)}
            >
              {summary && (
                <>
                  <span className="calendar-day-summary">
                    <span className="calendar-day-summary-line">
                      {summary.present} present
                    </span>
                    <span className="calendar-day-summary-line">
                      {summary.absent} absent
                    </span>
                    <span className="calendar-day-summary-line">
                      {Math.max(
                        0,
                        summary.totalEmployees -
                          summary.present -
                          summary.absent,
                      )}{" "}
                      remaining
                    </span>
                  </span>
                  <span className="calendar-day-summary-compact">
                    {summary.present}/{summary.totalEmployees}
                  </span>
                </>
              )}
              <span>{day.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
