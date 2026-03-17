'use client';

import { useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDaysInMonth, getFirstDayOfWeek, isSameDay, isToday } from './date-utils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

interface CalendarGridProps {
  /** Currently viewed year */
  year: number;
  /** Currently viewed month (0-indexed) */
  month: number;
  /** Selected date (if any) */
  selectedDate: Date | null;
  /** Min selectable date */
  minDate?: Date | null;
  /** Max selectable date */
  maxDate?: Date | null;
  /** Called when a day is clicked */
  onSelectDay: (day: number) => void;
  /** Navigate to previous month */
  onPrevMonth: () => void;
  /** Navigate to next month */
  onNextMonth: () => void;
}

export function CalendarGrid({
  year,
  month,
  selectedDate,
  minDate,
  maxDate,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: CalendarGridProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);

  const monthLabel = useMemo(() => {
    const d = new Date(year, month);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, [year, month]);

  const isDayDisabled = useCallback(
    (day: number) => {
      const d = new Date(year, month, day);
      if (minDate) {
        const minDay = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
        if (d < minDay) return true;
      }
      if (maxDate) {
        const maxDay = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
        if (d > maxDay) return true;
      }
      return false;
    },
    [year, month, minDate, maxDate]
  );

  // Can we go to previous month? Check if any day in prev month is >= minDate
  const canGoPrev = useMemo(() => {
    if (!minDate) return true;
    const lastDayOfPrev = new Date(year, month, 0); // last day of previous month
    return lastDayOfPrev >= new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  }, [year, month, minDate]);

  const canGoNext = useMemo(() => {
    if (!maxDate) return true;
    const firstDayOfNext = new Date(year, month + 1, 1);
    return firstDayOfNext <= new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
  }, [year, month, maxDate]);

  // Build the grid cells: leading blanks + day numbers
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* Month navigation */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          disabled={!canGoPrev}
          className="rounded p-1 text-muted-foreground hover:bg-sb-turf disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <button
          type="button"
          onClick={onNextMonth}
          disabled={!canGoNext}
          className="rounded p-1 text-muted-foreground hover:bg-sb-turf disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-xs font-medium text-muted-foreground">
            {wd}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`blank-${i}`} />;
          }

          const date = new Date(year, month, day);
          const disabled = isDayDisabled(day);
          const selected = selectedDate ? isSameDay(date, selectedDate) : false;
          const today = isToday(date);

          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDay(day)}
              className={[
                'flex h-8 w-full items-center justify-center rounded text-sm transition-colors',
                disabled && 'cursor-not-allowed text-muted-foreground/40',
                !disabled && !selected && 'hover:bg-sb-turf',
                selected && 'bg-warning font-semibold text-white',
                !selected && today && 'border border-warning font-medium',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
