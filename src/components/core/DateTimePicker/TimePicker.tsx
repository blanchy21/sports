'use client';

import { useMemo } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  /** Current hour (0-23) */
  hour: number;
  /** Current minute (0-55, 5-min increments) */
  minute: number;
  /** Called when hour or minute changes */
  onChange: (hour: number, minute: number) => void;
  /** Min datetime — disables times before this on the same day */
  minDate?: Date | null;
  /** The currently selected date (for same-day min comparison) */
  selectedDate?: Date | null;
}

/** Hour label in 12-hour format */
function hourLabel(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export function TimePicker({ hour, minute, onChange, minDate, selectedDate }: TimePickerProps) {
  // Determine which hours/minutes are disabled based on min constraint
  const { minHour, minMinute } = useMemo(() => {
    if (!minDate || !selectedDate) return { minHour: 0, minMinute: 0 };

    const sameDay =
      selectedDate.getFullYear() === minDate.getFullYear() &&
      selectedDate.getMonth() === minDate.getMonth() &&
      selectedDate.getDate() === minDate.getDate();

    if (!sameDay) return { minHour: 0, minMinute: 0 };

    return { minHour: minDate.getHours(), minMinute: minDate.getMinutes() };
  }, [minDate, selectedDate]);

  const selectClass =
    'flex-1 rounded-lg border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-warning';

  return (
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
      <select
        value={hour}
        onChange={(e) => {
          const newHour = Number(e.target.value);
          // If new hour is the min hour, clamp minute up if needed
          const clampedMinute =
            newHour === minHour && minute < minMinute ? Math.ceil(minMinute / 5) * 5 : minute;
          onChange(newHour, clampedMinute);
        }}
        className={selectClass}
        aria-label="Hour"
      >
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h} disabled={h < minHour}>
            {hourLabel(h)}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground">:</span>
      <select
        value={minute}
        onChange={(e) => onChange(hour, Number(e.target.value))}
        className={selectClass}
        aria-label="Minute"
      >
        {Array.from({ length: 12 }, (_, i) => {
          const m = i * 5;
          const disabled = hour === minHour && m < minMinute;
          return (
            <option key={m} value={m} disabled={disabled}>
              {String(m).padStart(2, '0')}
            </option>
          );
        })}
      </select>
    </div>
  );
}
