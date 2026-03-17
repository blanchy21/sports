'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays } from 'lucide-react';
import { CalendarGrid } from './CalendarGrid';
import { TimePicker } from './TimePicker';
import {
  buildDate,
  formatDisplayDateTime,
  formatLocalDateTime,
  parseLocalDateTime,
  roundMinutesDown,
} from './date-utils';

interface DesktopDateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
}

interface Preset {
  label: string;
  getDate: () => Date;
}

function getPresets(): Preset[] {
  const now = new Date();
  return [
    { label: '1hr', getDate: () => new Date(now.getTime() + 60 * 60 * 1000) },
    { label: '3hr', getDate: () => new Date(now.getTime() + 3 * 60 * 60 * 1000) },
    { label: '6hr', getDate: () => new Date(now.getTime() + 6 * 60 * 60 * 1000) },
    {
      label: 'Tomorrow 12pm',
      getDate: () => {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        d.setHours(12, 0, 0, 0);
        return d;
      },
    },
    {
      label: 'In 3 days',
      getDate: () => {
        const d = new Date(now);
        d.setDate(d.getDate() + 3);
        d.setHours(12, 0, 0, 0);
        return d;
      },
    },
  ];
}

export function DesktopDateTimePicker({
  value,
  onChange,
  min,
  max,
  disabled,
  placeholder = 'Select date & time',
}: DesktopDateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const parsed = useMemo(() => parseLocalDateTime(value), [value]);
  const minDate = useMemo(() => (min ? parseLocalDateTime(min) : null), [min]);
  const maxDate = useMemo(() => (max ? parseLocalDateTime(max) : null), [max]);

  // Calendar view state: which month are we showing?
  const [viewYear, setViewYear] = useState(() =>
    parsed ? parsed.getFullYear() : new Date().getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(() =>
    parsed ? parsed.getMonth() : new Date().getMonth()
  );

  // Sync view to selected date when value changes externally
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [parsed]);

  // Position popover relative to trigger, flip above if no room below
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 420; // approximate max height of the popover
    const popoverWidth = 320; // w-80 = 20rem = 320px
    const gap = 4;

    // Prefer below, flip above if not enough viewport space
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight + gap && rect.top > spaceBelow;

    const top = placeAbove ? rect.top - popoverHeight - gap : rect.bottom + gap;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popoverWidth - 8));

    setPopoverStyle({ position: 'fixed', top, left });
  }, [open]);

  // Close on click outside (check both trigger and portal popover)
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const emitChange = useCallback(
    (d: Date) => {
      // Clamp to min/max
      if (minDate && d < minDate) d = minDate;
      if (maxDate && d > maxDate) d = maxDate;
      onChange(formatLocalDateTime(d));
    },
    [onChange, minDate, maxDate]
  );

  const handleSelectDay = useCallback(
    (day: number) => {
      const hour = parsed ? parsed.getHours() : 12;
      const minute = parsed ? roundMinutesDown(parsed.getMinutes()) : 0;
      emitChange(buildDate(viewYear, viewMonth, day, hour, minute));
    },
    [parsed, viewYear, viewMonth, emitChange]
  );

  const handleTimeChange = useCallback(
    (hour: number, minute: number) => {
      if (!parsed) {
        // No date selected yet — use today
        const now = new Date();
        emitChange(buildDate(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute));
      } else {
        emitChange(
          buildDate(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), hour, minute)
        );
      }
    },
    [parsed, emitChange]
  );

  const handlePrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const presets = useMemo(() => getPresets(), []);

  const isPresetDisabled = useCallback(
    (preset: Preset) => {
      const d = preset.getDate();
      if (minDate && d < minDate) return true;
      if (maxDate && d > maxDate) return true;
      return false;
    },
    [minDate, maxDate]
  );

  const handlePreset = useCallback(
    (preset: Preset) => {
      emitChange(preset.getDate());
    },
    [emitChange]
  );

  const displayText = parsed ? formatDisplayDateTime(parsed) : null;

  return (
    <>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={[
          'flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-warning',
          'disabled:cursor-not-allowed disabled:opacity-50',
          displayText ? 'text-sb-text-primary' : 'text-muted-foreground',
        ].join(' ')}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{displayText ?? placeholder}</span>
      </button>

      {/* Popover — portalled to body to escape overflow:hidden ancestors */}
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="z-50 w-80 rounded-lg border bg-sb-stadium p-4 shadow-lg"
            style={popoverStyle}
          >
            {/* Quick presets */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={isPresetDisabled(preset)}
                  onClick={() => handlePreset(preset)}
                  className="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-warning hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <CalendarGrid
              year={viewYear}
              month={viewMonth}
              selectedDate={parsed}
              minDate={minDate}
              maxDate={maxDate}
              onSelectDay={handleSelectDay}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />

            {/* Time picker */}
            <div className="mt-3 border-t pt-3">
              <TimePicker
                hour={parsed ? parsed.getHours() : 12}
                minute={parsed ? roundMinutesDown(parsed.getMinutes()) : 0}
                onChange={handleTimeChange}
                minDate={minDate}
                selectedDate={parsed}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
